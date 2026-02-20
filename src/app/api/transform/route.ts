import { NextRequest, NextResponse } from 'next/server';
import { transformEDStoEDC } from '@/lib/transform';

export async function POST(request: NextRequest) {
  try {
    const { rawText, manualNotes } = await request.json();

    if (!rawText || rawText.length < 100) {
      return NextResponse.json(
        { error: "This doesn't look like a complete EDS. Please paste the full document content." },
        { status: 400 }
      );
    }

    const edcData = await transformEDStoEDC(rawText, manualNotes || undefined);
    return NextResponse.json(edcData);
  } catch (error) {
    console.error('Transform error:', error);
    const message = error instanceof Error ? error.message : 'Transformation failed — please try again';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
