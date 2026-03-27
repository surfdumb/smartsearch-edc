import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: Request,
  { params }: { params: { searchId: string } }
) {
  const searchId = params.searchId;
  const debug: Record<string, unknown> = {};

  // 1. Check fixture loading
  try {
    const filePath = path.join(process.cwd(), 'data', 'decks', `${searchId}.json`);
    debug.fixture_path = filePath;
    debug.cwd = process.cwd();
    debug.fixture_exists = fs.existsSync(filePath);
    if (debug.fixture_exists) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      debug.fixture_keys = Object.keys(parsed);
      debug.fixture_key_criteria_names = parsed.key_criteria_names;
      debug.fixture_candidate_statuses = parsed.candidate_statuses;
      debug.fixture_search_name = parsed.search_name;
      debug.fixture_client_company = parsed.client_company;
    }
  } catch (e) {
    debug.fixture_error = String(e);
  }

  // 2. Check dynamic import
  try {
    const mod = await import(`../../../../../data/decks/${searchId}.json`);
    debug.dynamic_import_keys = Object.keys(mod.default || mod);
    debug.dynamic_import_criteria = (mod.default || mod).key_criteria_names;
  } catch (e) {
    debug.dynamic_import_error = String(e);
  }

  // 3. Check sheets access
  const SHEETS_ENABLED = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  debug.sheets_enabled = SHEETS_ENABLED;

  if (SHEETS_ENABLED) {
    try {
      const { getEDSRowsForSearch, getJSRow } = await import('@/lib/sheets');

      // EDS rows
      const edsRows = await getEDSRowsForSearch(searchId);
      debug.eds_row_count = edsRows.length;
      if (edsRows.length > 0) {
        debug.eds_headers = Object.keys(edsRows[0]);
        debug.eds_first_row_col0 = Object.values(edsRows[0])[0];
        debug.eds_first_row_col1 = Object.values(edsRows[0])[1];
        debug.eds_first_row_col2 = Object.values(edsRows[0])[2];
      }

      // JS row lookup
      const edsSearchName = edsRows.length > 0 ? (Object.values(edsRows[0])[0] || searchId) : searchId;
      debug.js_lookup_key = edsSearchName;

      const jsRow = await getJSRow(edsSearchName);
      debug.js_row_found = jsRow !== null;
      if (jsRow) {
        debug.js_headers = Object.keys(jsRow);
        debug.js_row_col0 = Object.values(jsRow)[0];
        debug.js_row_col1 = Object.values(jsRow)[1];
        debug.js_row_col2 = Object.values(jsRow)[2];
        // Criteria names at indices 9, 12, 15, 18, 21
        const js = Object.values(jsRow);
        debug.js_criteria_indices = {
          9: js[9], 12: js[12], 15: js[15], 18: js[18], 21: js[21],
        };
      }

      // Also try direct search by searchId
      const jsRow2 = await getJSRow(searchId);
      debug.js_row_by_searchId = jsRow2 !== null;
      if (jsRow2) {
        debug.js_row2_col0 = Object.values(jsRow2)[0];
        debug.js_row2_col1 = Object.values(jsRow2)[1];
      }
    } catch (e) {
      debug.sheets_error = String(e);
    }
  }

  return NextResponse.json(debug);
}
