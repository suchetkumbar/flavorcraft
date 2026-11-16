// Vercel Function: the page link-preview crawlers get for /remixes/:id.
//
// vercel.json sends requests here only when the visitor looks like a crawler
// (Slack, WhatsApp, X, Facebook, Discord and so on); people get the app. The
// page carries the remix's title, a one-line description and its share image,
// which the `flavor-api` Supabase function draws.
import { isRemixId, sharePage, type SharedRemix } from '../src/lib/api/sharePage';

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Crawlers re-fetch rarely; let the CDN absorb repeats.
      'Cache-Control': status === 200 ? 'public, max-age=0, s-maxage=600' : 'no-store',
    },
  });

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let remix: SharedRemix | null = null;
  if (supabaseUrl && key && isRemixId(id)) {
    try {
      // As an anonymous visitor: row-level security returns the remix only if it is public.
      const res = await fetch(`${supabaseUrl}/rest/v1/remixes?id=eq.${id}&is_public=eq.true&select=title,note,removed,added&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) remix = ((await res.json()) as SharedRemix[])[0] ?? null;
    } catch {
      // Fall through to the generic preview.
    }
  }

  const imageUrl = remix && supabaseUrl ? `${supabaseUrl}/functions/v1/flavor-api/remix/${id}/card.png` : null;
  return html(sharePage({ origin: url.origin, id, remix, imageUrl }), remix ? 200 : 404);
}
