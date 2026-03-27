import { NextResponse } from 'next/server';
import { getCandidateData } from '@/lib/data';

export async function GET(
  _request: Request,
  { params }: { params: { searchId: string; candidateId: string } }
) {
  const { searchId, candidateId } = params;

  try {
    const edcData = await getCandidateData(searchId, candidateId);

    if (!edcData) {
      return NextResponse.json(
        { error: 'Candidate not found', candidateId, searchId },
        { status: 404 }
      );
    }

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
