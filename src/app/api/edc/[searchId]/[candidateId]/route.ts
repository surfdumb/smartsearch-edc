import { NextResponse } from 'next/server';
import { getEDSRowsForSearch, getJSRow } from '@/lib/sheets';
import { transformToEDCData, candidateIdMatchesName } from '@/lib/sheets-transform';

export async function GET(
  _request: Request,
  { params }: { params: { searchId: string; candidateId: string } }
) {
  const { searchId, candidateId } = params;

  try {
    const edsRows = await getEDSRowsForSearch(searchId);

    if (!edsRows.length) {
      return NextResponse.json(
        { error: 'Search not found in EDS Text Store', searchId },
        { status: 404 }
      );
    }

    // Match candidate by slug (e.g. "c-snider" → "Christopher Snider")
    const edsRow = edsRows.find((row) => {
      const name = Object.values(row)[1] || '';
      return candidateIdMatchesName(candidateId, name);
    });

    if (!edsRow) {
      return NextResponse.json(
        { error: 'Candidate not found', candidateId, searchId },
        { status: 404 }
      );
    }

    const searchName = Object.values(edsRow)[0] || searchId;
    const jsRow = await getJSRow(searchName);
    const edcData = transformToEDCData(edsRow, jsRow, searchId);

    return NextResponse.json(edcData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[api/edc] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch EDC data', details: String(error) },
      { status: 500 }
    );
  }
}
