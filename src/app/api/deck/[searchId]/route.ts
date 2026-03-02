import { NextResponse } from 'next/server';
import { getEDSRowsForSearch, getJSRow } from '@/lib/sheets';
import { transformToSearchContext } from '@/lib/sheets-transform';

export async function GET(
  _request: Request,
  { params }: { params: { searchId: string } }
) {
  const { searchId } = params;

  try {
    const edsRows = await getEDSRowsForSearch(searchId);

    if (!edsRows.length) {
      return NextResponse.json(
        { error: 'Search not found', searchId },
        { status: 404 }
      );
    }

    const searchName = Object.values(edsRows[0])[0] || searchId;
    const jsRow = await getJSRow(searchName);
    const context = transformToSearchContext(edsRows, jsRow, searchId);

    return NextResponse.json(context, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[api/deck] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deck data', details: String(error) },
      { status: 500 }
    );
  }
}
