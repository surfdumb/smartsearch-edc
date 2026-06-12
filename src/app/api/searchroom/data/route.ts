import { NextResponse } from "next/server";
import data from "@/app/searchroom/data.json";

/**
 * Search Room board data.
 *
 * This is the data source for the "Sync" button on /searchroom and the
 * "Synced N ago" indicator. The canonical source of truth is the SmartSearch
 * Company Spreadsheet (live-searches tab) on SharePoint:
 *   https://smartsearchexec.sharepoint.com/.../Company%20Spreadsheet.xlsx
 *
 * Right now this endpoint returns the static snapshot that was exported from
 * that spreadsheet (`data.json`, including its `synced_at` timestamp). The
 * response shape — { synced_at, searches, candidates } — is the integration
 * seam: when the live read is built, only this handler changes; the
 * /searchroom client needs no edits.
 *
 * TODO(searchroom): read the Company Spreadsheet live via Microsoft Graph
 * (Azure app registration + Graph credentials in env) and set `synced_at` to
 * the workbook's lastModifiedDateTime so Sync reflects genuine freshness.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
