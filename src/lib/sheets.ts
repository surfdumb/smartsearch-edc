import { google } from 'googleapis';

const SPREADSHEET_ID = '1FOcDCMlmmHs9TL1WxhLE_R4Y6cQng-ICWo7Pjr0xtaA';
const EDS_SHEET_NAME = 'EDS Text Store';
const JS_SHEET_NAME = 'JS Text Store';

export interface SheetRow {
  [key: string]: string;
}

function getAuthClient() {
  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID,
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

/**
 * Fetch all rows from a sheet tab, returning objects keyed by column header.
 */
async function getSheetData(sheetName: string): Promise<SheetRow[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0] as string[];
  return rows.slice(1).map((row) => {
    const obj: SheetRow = {};
    headers.forEach((header, i) => {
      obj[header] = (row[i] as string) || '';
    });
    return obj;
  });
}

/**
 * Get all EDS rows for a given search_key (column index 0).
 */
export async function getEDSRowsForSearch(searchKey: string): Promise<SheetRow[]> {
  const rows = await getSheetData(EDS_SHEET_NAME);
  const key = searchKey.toLowerCase().trim();
  return rows.filter((row) => {
    const rowKey = Object.values(row)[0]?.toLowerCase().trim();
    return rowKey === key;
  });
}

/**
 * Find a single candidate's EDS row by search_key + candidate_name.
 */
export async function getEDSRow(
  searchKey: string,
  candidateName: string
): Promise<SheetRow | null> {
  const rows = await getEDSRowsForSearch(searchKey);
  const name = candidateName.toLowerCase().trim();
  return (
    rows.find((row) => {
      const rowName = Object.values(row)[1]?.toLowerCase().trim();
      return rowName === name;
    }) ?? null
  );
}

/**
 * Find a Job Summary row by search_name (column index 0).
 */
export async function getJSRow(searchName: string): Promise<SheetRow | null> {
  const rows = await getSheetData(JS_SHEET_NAME);
  const name = searchName.toLowerCase().trim();
  return (
    rows.find((row) => {
      const rowName = Object.values(row)[0]?.toLowerCase().trim();
      return rowName === name;
    }) ?? null
  );
}
