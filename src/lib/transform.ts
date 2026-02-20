import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EDCData } from './types';
import { TRANSFORM_SYSTEM_PROMPT } from './transform-prompt';

function getApiKey(): string {
  // First try process.env (works when not shadowed by empty system env var)
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey;

  // Fallback: read .env.local directly (handles case where system env
  // has ANTHROPIC_API_KEY='' which prevents .env.local from overriding)
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

export async function transformEDStoEDC(rawText: string, manualNotes?: string): Promise<EDCData> {
  const apiKey = getApiKey();
  const client = new Anthropic({ apiKey });

  let content = `${TRANSFORM_SYSTEM_PROMPT}\n\n---\n\nEDS CONTENT:\n${rawText}`;

  if (manualNotes && manualNotes.trim().length > 0) {
    content += `\n\n---\n\nMANUAL NOTES (consultant's raw notes — use these as the PRIMARY source for Our Take):\n${manualNotes}`;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to extract JSON from response');
  return JSON.parse(jsonMatch[0]) as EDCData;
}
