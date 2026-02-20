import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GENERATE_OUR_TAKE_PROMPT } from '@/lib/generate-our-take-prompt';

function getApiKey(): string {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey;

  try {
    const envPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('ANTHROPIC_API_KEY=')) {
        const val = trimmed.slice('ANTHROPIC_API_KEY='.length).trim();
        if (val.length > 0) return val;
      }
    }
  } catch {
    // .env.local doesn't exist or can't be read
  }

  throw new Error('ANTHROPIC_API_KEY is not configured. Please set it in .env.local');
}

export async function POST(request: NextRequest) {
  try {
    const { candidateContext, manualNotes } = await request.json();

    if (!candidateContext) {
      return NextResponse.json(
        { error: 'Candidate context is required to generate Our Take.' },
        { status: 400 }
      );
    }

    const apiKey = getApiKey();
    const client = new Anthropic({ apiKey });

    let prompt = `${GENERATE_OUR_TAKE_PROMPT}\n\n---\n\nCANDIDATE CONTEXT:\n${candidateContext}`;

    if (manualNotes && manualNotes.trim().length > 0) {
      prompt += `\n\n---\n\nMANUAL NOTES (consultant's raw notes — PRIMARY source):\n${manualNotes}`;
    } else {
      prompt += `\n\n---\n\nMANUAL NOTES: None provided. Generate Our Take from the candidate context only. Note this in the ai_rationale.`;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON from response');

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate Our Take error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate Our Take — please try again';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
