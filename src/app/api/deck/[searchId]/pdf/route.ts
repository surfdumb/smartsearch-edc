import { NextRequest } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { format } from 'date-fns';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

function shortenPosition(position: string): string {
  if (position.includes(' / ')) {
    return position.split(' / ').pop()?.trim() ?? position;
  }
  return position;
}

function safeForFilename(s: string): string {
  return s
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// ASCII-only fallback for the legacy `filename=` parameter. HTTP headers are
// Latin-1, and even Latin-1 isn't safe across all clients — transliterate the
// common Unicode punctuation we actually hit (em/en dashes, smart quotes),
// then strip anything still non-ASCII.
function asciiFallback(s: string): string {
  return s
    .replace(/[—–]/g, '-')      // em dash, en dash
    .replace(/[‘’]/g, "'")       // smart single quotes
    .replace(/[“”]/g, '"')       // smart double quotes
    .replace(/[^\x20-\x7E]/g, '')          // drop any remaining non-ASCII
    .replace(/"/g, '');                    // strip quotes (they break the header)
}

function buildFilename(client: string, position: string): string {
  const dateStr = format(new Date(), 'dd-MMM-yyyy');
  const positionShort = shortenPosition(position);
  return `SmartSearch Job Summary - ${safeForFilename(client)} ${safeForFilename(positionShort)} - ${dateStr}.pdf`;
}

// RFC 5987 / RFC 6266: send an ASCII `filename=` for legacy clients plus a
// `filename*=UTF-8''…` with the original Unicode (percent-encoded) so modern
// clients keep characters like em dash in the downloaded filename. Without
// this, putting raw Unicode into the header throws "Invalid character in
// header content" when the Response is constructed.
function contentDispositionAttachment(filename: string): string {
  const fallback = asciiFallback(filename);
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { searchId: string } }
) {
  const supabase = getServiceClient();

  const { data: search, error } = await supabase
    .from('searches')
    .select('client, client_display_name, role_title, position, search_key')
    .eq('search_key', params.searchId)
    .single();

  if (error || !search) {
    return new Response('Search not found', { status: 404 });
  }

  const clientName = search.client_display_name || search.client || '';
  const positionName = search.role_title || search.position || '';
  const filename = buildFilename(clientName, positionName);

  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = request.headers.get('host');
  const url = `${protocol}://${host}/deck/${params.searchId}#brief`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 });

    await page
      .waitForSelector('[data-pdf-ready="true"]', { timeout: 5000 })
      .catch(() => {});

    // Wait for all web fonts to fully load before generating the PDF.
    // Without this, Google Fonts can race past networkidle0 — Adobe then falls
    // back to substitute fonts with different metrics, dropping characters
    // mid-line (e.g. "SVPCSM" instead of "SVP CSM", "todesign" instead of
    // "to design"). Preview is forgiving; Adobe is strict.
    await page.evaluateHandle('document.fonts.ready');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
      displayHeaderFooter: false,
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDispositionAttachment(filename),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error(`[deck/pdf] generation failed for ${params.searchId}`, err);
    return new Response('PDF generation failed', { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
