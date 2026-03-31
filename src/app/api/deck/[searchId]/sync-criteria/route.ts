import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { readFileSync } from "fs";
import { join } from "path";

const SPREADSHEET_ID = "1FOcDCMlmmHs9TL1WxhLE_R4Y6cQng-ICWo7Pjr0xtaA";
const JS_TEXT_STORE_SHEET = "JS Text Store";

// Column layout in JS Text Store (0-indexed values array):
// J=9:  Criteria1Name,  K=10: Criteria1Flash,  L=11: Criteria1Detail
// M=12: Criteria2Name,  N=13: Criteria2Flash,  O=14: Criteria2Detail
// P=15: Criteria3Name,  Q=16: Criteria3Flash,  R=17: Criteria3Detail
// S=18: Criteria4Name,  T=19: Criteria4Flash,  U=20: Criteria4Detail
// V=21: Criteria5Name,  W=22: Criteria5Flash,  X=23: Criteria5Detail
// AA=26: AltCriteria1Name, AB=27: AltCriteria1Description
// AC=28: AltCriteria2Name, AD=29: AltCriteria2Description
// AE=30: AltCriteria3Name, AF=31: AltCriteria3Description
// AU=46: criteria_finalised_date, AV=47: criteria_finalised_by

function getApiKey(): string {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey;

  try {
    const envPath = join(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("ANTHROPIC_API_KEY=")) {
        const val = trimmed.slice("ANTHROPIC_API_KEY=".length).trim();
        if (val.length > 0) return val;
      }
    }
  } catch {
    // .env.local doesn't exist or can't be read
  }

  throw new Error("ANTHROPIC_API_KEY is not configured");
}

function getWritableAuthClient() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function loadFixture(searchId: string): Record<string, unknown> | null {
  try {
    const fixturePath = join(process.cwd(), "data", "decks", `${searchId}.json`);
    const raw = readFileSync(fixturePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const EXTRACTION_PROMPT = `Extract the Key Criteria from this Job Summary document. Return ONLY valid JSON, no markdown fences, no explanation.

The JSON must have this exact structure:
{
  "criteria": [
    {
      "name": "Exact criterion name as written in the document",
      "flash": "3-8 word summary headline",
      "detail": "1-2 sentence description of what this criterion means"
    }
  ],
  "alt_criteria": [
    {
      "name": "Optional/alternative criterion name",
      "description": "Description of the optional criterion"
    }
  ]
}

Rules:
- Extract criteria EXACTLY as named in the document — do not rename or reinterpret
- Maximum 5 main criteria, maximum 3 alternative criteria
- If the document has fewer criteria, return fewer (don't invent extras)
- The "flash" should be a pithy summary, not a repeat of the name
- The "detail" should explain what evidence would demonstrate this criterion
- Preserve the order as written in the document
- If there's a "Nice to have" or "Alternative" section, put those in alt_criteria`;

export async function POST(
  request: Request,
  { params }: { params: { searchId: string } }
): Promise<NextResponse> {
  try {
    const { pdfUrl } = await request.json();
    const { searchId } = params;

    if (!pdfUrl) {
      return NextResponse.json({ error: "pdfUrl required" }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/i.test(searchId)) {
      return NextResponse.json({ error: "Invalid searchId" }, { status: 400 });
    }

    // Step 1: Get js_search_name from fixture
    const fixture = loadFixture(searchId);
    const jsSearchName = fixture?.js_search_name as string | undefined;
    if (!jsSearchName) {
      return NextResponse.json(
        { error: `No js_search_name found in fixture for ${searchId}` },
        { status: 404 }
      );
    }

    // Step 2: Find the JS Text Store row
    const auth = getWritableAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const jsColumn = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${JS_TEXT_STORE_SHEET}'!A:A`,
    });
    const jsRows = jsColumn.data.values || [];
    let jsRowIndex = -1;
    for (let i = 0; i < jsRows.length; i++) {
      if (jsRows[i][0]?.trim() === jsSearchName.trim()) {
        jsRowIndex = i + 1; // 1-based for Sheets API
        break;
      }
    }
    if (jsRowIndex === -1) {
      return NextResponse.json(
        { error: `No JS Text Store row found for "${jsSearchName}"` },
        { status: 404 }
      );
    }

    // Step 3: Fetch the PDF and convert to base64
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${pdfResponse.status}` },
        { status: 500 }
      );
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Step 4: Send to Claude for criteria extraction
    const client = new Anthropic({ apiKey: getApiKey() });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let extracted: {
      criteria: { name: string; flash: string; detail: string }[];
      alt_criteria?: { name: string; description: string }[];
    };
    try {
      // Try direct parse first, then regex fallback
      const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0] || responseText;
      extracted = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response", raw: responseText },
        { status: 500 }
      );
    }

    // Step 5: Build update values
    const criteria = extracted.criteria || [];
    const altCriteria = extracted.alt_criteria || [];

    // Pad to 5 main criteria slots (3 columns each: name, flash, detail)
    const padded = [...criteria];
    while (padded.length < 5) padded.push({ name: "", flash: "", detail: "" });
    const criteriaValues = padded
      .slice(0, 5)
      .flatMap((c) => [c.name || "", c.flash || "", c.detail || ""]);

    // Pad to 3 alt criteria slots (2 columns each: name, description)
    const paddedAlt = [...altCriteria];
    while (paddedAlt.length < 3) paddedAlt.push({ name: "", description: "" });
    const altValues = paddedAlt
      .slice(0, 3)
      .flatMap((c) => [c.name || "", c.description || ""]);

    const today = new Date().toISOString().split("T")[0];

    // Step 6: Write to Google Sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: `'${JS_TEXT_STORE_SHEET}'!J${jsRowIndex}:X${jsRowIndex}`,
            values: [criteriaValues],
          },
          {
            range: `'${JS_TEXT_STORE_SHEET}'!AA${jsRowIndex}:AF${jsRowIndex}`,
            values: [altValues],
          },
          {
            range: `'${JS_TEXT_STORE_SHEET}'!AU${jsRowIndex}:AV${jsRowIndex}`,
            values: [[today, "AI Sync"]],
          },
        ],
      },
    });

    console.log(
      `[sync-criteria] Updated ${criteria.length} criteria for "${jsSearchName}" (row ${jsRowIndex})`
    );

    return NextResponse.json({
      success: true,
      searchId,
      jsSearchName,
      jsRowIndex,
      criteriaCount: criteria.length,
      altCriteriaCount: altCriteria.length,
      criteria: criteria.map((c) => c.name),
    });
  } catch (error) {
    console.error("[sync-criteria] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
