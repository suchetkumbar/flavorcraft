import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../api/share';
import { describeRemix, isRemixId, sharePage } from './sharePage';

const ID = '11111111-1111-4111-8111-111111111111';
const remix = { title: 'Sharper <b>cabbage</b>', note: 'For "Friday"', removed: ['Butter'], added: ['Rice Vinegar', 'Mint'] };

describe('remix share page', () => {
  it('describes a remix by what it changed', () => {
    expect(describeRemix({ title: 't', note: null, removed: ['Butter'], added: ['Rice Vinegar', 'Mint'] })).toBe(
      'This remix adds rice vinegar and mint and leaves out butter.',
    );
    expect(describeRemix({ title: 't', note: '  Brighter,\nfor summer ', removed: [], added: [] })).toBe(
      'Brighter, for summer A remix with its own flavor chart.',
    );
    expect(describeRemix({ title: 't', note: 'x'.repeat(1000), removed: [], added: [] }).length).toBeLessThanOrEqual(300);
  });

  it('puts the remix title, description and image where crawlers look, escaped', () => {
    const page = sharePage({ origin: 'https://fc.example', id: ID, remix, imageUrl: 'https://p.supabase.co/functions/v1/flavor-api/remix/x/card.png' });
    expect(page).toContain('<meta property="og:title" content="Sharper &lt;b&gt;cabbage&lt;/b&gt;, a FlavorCraft remix">');
    expect(page).toContain(`<meta property="og:url" content="https://fc.example/remixes/${ID}">`);
    expect(page).toContain('<meta property="og:image" content="https://p.supabase.co/functions/v1/flavor-api/remix/x/card.png">');
    expect(page).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(page).toContain('For &quot;Friday&quot;');
    expect(page).not.toContain('<b>');
    expect(page).not.toMatch(/<script/i);
  });

  it('falls back to the site preview when there is no remix to show', () => {
    const page = sharePage({ origin: 'https://fc.example', id: ID, remix: null, imageUrl: null });
    expect(page).toContain('<meta property="og:image" content="https://fc.example/og-image.png">');
    expect(page).toContain('<meta property="og:url" content="https://fc.example">');
  });

  it('only accepts real remix ids', () => {
    expect(isRemixId(ID)).toBe(true);
    expect(isRemixId('abc')).toBe(false);
    expect(isRemixId(`${ID}&select=*`)).toBe(false);
  });
});

describe('share function', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://p.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk');
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('looks the remix up as an anonymous visitor and returns its preview', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([remix])));
    const res = await GET(new Request(`https://fc.example/api/share?id=${ID}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/html/);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/rest/v1/remixes?id=eq.${ID}&is_public=eq.true`);
    expect(init.headers.apikey).toBe('pk');
    const page = await res.text();
    expect(page).toContain(`https://p.supabase.co/functions/v1/flavor-api/remix/${ID}/card.png`);
    expect(page).toContain(`https://fc.example/remixes/${ID}`);
  });

  it('answers 404 with the generic preview for private, missing or malformed ids, without leaking anything', async () => {
    fetchMock.mockResolvedValue(new Response('[]'));
    const missing = await GET(new Request(`https://fc.example/api/share?id=${ID}`));
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBe('no-store');
    expect(await missing.text()).toContain('og-image.png');

    fetchMock.mockReset();
    const bad = await GET(new Request('https://fc.example/api/share?id=1%20or%201=1'));
    expect(bad.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled(); // a malformed id never reaches the database
  });

  it('still answers when the database is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const res = await GET(new Request(`https://fc.example/api/share?id=${ID}`));
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('FlavorCraft: cook by taste');
  });
});
