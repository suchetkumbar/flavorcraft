import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { parseIngredients, profileResponse } from '@/lib/api/engine';
import { chartSvg } from '@/lib/api/svg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/flavor-api` : null;

const ENDPOINTS: { path: string; what: string }[] = [
  { path: '/profile?ingredients=lime,fish sauce,chilli', what: 'The taste profile of a list of ingredients, as JSON: eight scores from 0 to 10, where each comes from, and anything it didn’t recognize. Also accepts POST with {"ingredients": [...]}.' },
  { path: '/chart.svg?ingredients=lime,fish sauce,chilli&title=Nam jim', what: 'The same profile drawn as a chart. Add size=240 to 900 for the width in pixels.' },
  { path: '/swaps?ingredient=butter', what: 'Ingredients that can stand in for one another, and why.' },
  { path: '/drinks?ingredients=cream,butter,pasta&alcohol=false', what: 'Two drinks that balance the dish and one that echoes it.' },
  { path: '/remix/{id}', what: 'A public remix: what changed, its ingredients and its profile.' },
  { path: '/remix/{id}/card.png', what: 'The 1200×630 share image for a public remix.' },
];

const copy = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error('Couldn’t copy. Select the text and copy it by hand.');
  }
};

const Developers = () => {
  useDocumentTitle('Embed a flavor chart');
  const [title, setTitle] = useState('Tamarind Chilli Prawns');
  const [text, setText] = useState('prawns, tamarind paste, brown sugar, fish sauce, red chilli, garlic, coriander');

  const lines = useMemo(() => parseIngredients(text), [text]);
  const profile = useMemo(() => (lines ? profileResponse(lines) : null), [lines]);
  // Drawn here by the same code the API runs, so the preview is exactly what readers will see.
  const preview = useMemo(
    () => (profile ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chartSvg(profile.vector, { title }))}` : null),
    [profile, title],
  );
  const snippet = useMemo(() => {
    if (!lines || !profile || !BASE) return '';
    const query = new URLSearchParams({ ingredients: lines.map((l) => l.name).join(','), ...(title.trim() && { title: title.trim() }) });
    const alt = `Flavor chart${title.trim() ? ` for ${title.trim()}` : ''}: ${profile.summary.toLowerCase()}`.replace(/"/g, '&quot;');
    return `<img src="${BASE}/chart.svg?${query.toString().replace(/&/g, '&amp;')}" alt="${alt}" width="420" loading="lazy">`;
  }, [lines, profile, title]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Put a flavor chart on your recipe</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          For food bloggers and anyone who publishes recipes. Paste your ingredient list, copy one line of HTML, and
          your readers see how the dish tastes before they cook it. Free, with no account.
        </p>

        <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px]" aria-labelledby="builder-title">
          <div className="min-w-0">
            <h2 id="builder-title" className="text-2xl font-bold">Make your chart</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="embed-title">Recipe name</Label>
                <Input id="embed-title" value={title} maxLength={70} onChange={(e) => setTitle(e.target.value)} className="max-w-md" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="embed-ingredients">Ingredients, separated by commas or one per line</Label>
                <Textarea id="embed-ingredients" value={text} rows={5} onChange={(e) => setText(e.target.value)} aria-describedby="embed-help" />
                <p id="embed-help" className="text-sm text-muted-foreground">
                  {!lines
                    ? 'Add between 1 and 60 ingredients.'
                    : profile && profile.unrecognized.length > 0
                      ? `Not recognized, so not counted: ${profile.unrecognized.join(', ')}.`
                      : `All ${lines.length} recognized. Amounts aren’t needed; write “salt: pinch” if you want one to count for less.`}
                </p>
              </div>
            </div>

            <h3 className="mt-8 text-lg font-semibold">Your embed code</h3>
            {!BASE ? (
              <p className="mt-2 text-sm text-muted-foreground">
                This copy of FlavorCraft has no server configured, so there is nowhere to serve the chart from.
              </p>
            ) : (
              <>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border bg-card p-4 text-sm"><code>{snippet || 'Add ingredients to get your code.'}</code></pre>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button disabled={!snippet} onClick={() => copy(snippet, 'Embed code copied')}>Copy the code</Button>
                  <span className="text-sm text-muted-foreground">Paste it into your post as HTML. It’s a plain image: no scripts, no tracking.</span>
                </div>
              </>
            )}
          </div>

          <aside>
            <div className="rounded-xl border bg-card p-4 lg:sticky lg:top-20">
              <p className="text-sm font-medium">What your readers will see</p>
              {preview ? (
                <img src={preview} alt={`Preview of the flavor chart: ${profile?.summary}`} className="mt-3 w-full" />
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Add ingredients to see the chart.</p>
              )}
            </div>
          </aside>
        </section>

        <section className="mt-16" aria-labelledby="api-title">
          <h2 id="api-title" className="text-2xl font-bold">The same engine, as an API</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Everything FlavorCraft computes without AI is available over plain HTTP, with no key. Scores are culinary
            estimates from a hand-tuned ingredient table, not measurements. Responses can be cached for an hour.
          </p>
          {BASE && (
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">Base address: </span>
              <code className="break-all rounded bg-muted px-1.5 py-0.5">{BASE}</code>
            </p>
          )}
          <ul className="mt-4 divide-y border-y">
            {ENDPOINTS.map((ep) => (
              <li key={ep.path} className="grid gap-x-6 gap-y-1 py-4 lg:grid-cols-[26rem_1fr]">
                <div className="min-w-0">
                  <code className="break-all text-sm font-medium">GET {ep.path}</code>
                  {BASE && !ep.path.includes('{id}') && (
                    <button
                      type="button"
                      className="mt-1 block text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={() => copy(`${BASE}${encodeURI(ep.path)}`, 'Address copied')}
                    >
                      Copy the full address
                    </button>
                  )}
                </div>
                <p className="text-sm">{ep.what}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Please be gentle: cache what you fetch, and get in touch before sending heavy traffic. The address above
            also answers with this list and the engine’s version.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Developers;
