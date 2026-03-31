import { NextResponse } from 'next/server';
import { getDeckData } from '@/lib/data';

export async function GET(
  _request: Request,
  { params }: { params: { searchId: string } }
) {
  const { searchId } = params;

  try {
    const context = await getDeckData(searchId);

    if (!context) {
      return NextResponse.json(
        { error: 'Search not found', searchId },
        { status: 404 }
      );
    }

    return NextResponse.json(context, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
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
