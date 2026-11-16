import { useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import RecipeCard from '@/components/RecipeCard';
import PhotoPicker from '@/components/PhotoPicker';
import AuthDialog from '@/components/kitchen/AuthDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { readDishPhoto } from '@/lib/kitchen/assistant';
import { spotted, type PreparedPhoto, type SpottedItem } from '@/lib/kitchen/photo';
import { KNOWN_INGREDIENTS } from '@/lib/flavor/ingredients';
import { computeProfile } from '@/lib/flavor/profile';
import { describeProfile, distance } from '@/lib/flavor/tastes';
import { accountsEnabled } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const CONFIDENCE = { high: 'Fairly sure', medium: 'Probably', low: 'A guess' } as const;

interface Reading {
  dish: string;
  confidence: keyof typeof CONFIDENCE | null;
}

const Photo = () => {
  useDocumentTitle('Taste a photo');
  const { data } = useCatalog();
  const signedIn = useAuth((s) => s.user !== null);
  const [authOpen, setAuthOpen] = useState(false);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [items, setItems] = useState<SpottedItem[]>([]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');

  const active = useMemo(() => items.filter((i) => !off.has(i.name)), [items, off]);
  const profile = useMemo(() => computeProfile(active.map((i) => ({ name: i.name, measure: '' }))), [active]);
  const enough = profile.matched >= 3;
  const closest = useMemo(() => {
    if (!data || !enough) return [];
    return data.recipes
      .filter((r) => r.flavor.matched >= 3)
      .map((r) => ({ r, d: distance(r.flavor.vector, profile.vector) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 6)
      .map((x) => x.r);
  }, [data, profile, enough]);

  const read = async (next: PreparedPhoto) => {
    setPhoto(next);
    setError('');
    setBusy(true);
    try {
      const answer = await readDishPhoto(next);
      const found = spotted(answer.ingredients, 14);
      if (!answer.isFood || found.length === 0) {
        setReading(null);
        setItems([]);
        setError('That doesn’t look like a plate of food. Try a closer photo of the dish, or list the ingredients below.');
        return;
      }
      setReading({ dish: answer.dish, confidence: answer.confidence });
      setItems(found);
      setOff(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const fresh = spotted(draft.split(/[,;\n]/)).filter((n) => !items.some((i) => i.name === n.name));
    if (fresh.length) setItems((prev) => [...prev, ...fresh]);
    setDraft('');
  };

  const toggle = (name: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Taste a photo</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          Photograph a dish you loved at a restaurant. FlavorCraft works out what’s in it, charts how it tastes, and
          finds recipes you can cook that taste the same way.
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <section className="rounded-xl border bg-card p-5" aria-labelledby="photo-title">
              <h2 id="photo-title" className="text-lg font-semibold">The dish</h2>
              <div className="mt-3 flex flex-wrap items-start gap-5">
                {photo && <img src={photo.dataUrl} alt="The photo you chose" className="h-40 w-40 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1 basis-60">
                  {!accountsEnabled ? (
                    <p className="text-sm text-muted-foreground">Reading photos needs accounts, which aren’t set up here. List the ingredients below.</p>
                  ) : signedIn ? (
                    <PhotoPicker
                      label={photo ? 'Choose another photo' : 'Take or choose a photo'}
                      busyLabel="Looking at the photo…"
                      busy={busy}
                      variant={photo ? 'outline' : 'default'}
                      onPhoto={read}
                      onError={setError}
                    />
                  ) : (
                    <Button onClick={() => setAuthOpen(true)}>Sign in to read a photo</Button>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">
                    The photo is shrunk on your device, sent to Google’s Gemini to be read, and not saved by FlavorCraft.
                    Avoid photos with people in them.
                  </p>
                  {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
                </div>
              </div>

              <div className="mt-5 border-t pt-4" aria-live="polite">
                {reading && (
                  <p>
                    <span className="text-muted-foreground">{reading.confidence ? `${CONFIDENCE[reading.confidence]}: ` : ''}</span>
                    <span className="text-lg font-semibold">{reading.dish || 'An unnamed dish'}</span>
                  </p>
                )}
                <h3 className="mt-2 text-sm font-semibold">{items.length ? 'What’s probably in it' : 'Or list what was in it'}</h3>
                {items.length > 0 && (
                  <>
                    <p className="text-sm text-muted-foreground">Turn off anything that’s wrong, and add what’s missing. The chart follows.</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {items.map((item) => {
                        const on = !off.has(item.name);
                        return (
                          <li key={item.name}>
                            <button
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggle(item.name)}
                              title={item.known ? undefined : 'FlavorCraft has no taste profile for this, so it doesn’t change the chart'}
                              className={cn(
                                'rounded-full border px-3 py-1 text-sm capitalize transition-colors',
                                on ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground line-through hover:bg-muted',
                                on && !item.known && 'border-dashed bg-transparent text-foreground',
                              )}
                            >
                              {item.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {items.some((i) => !i.known) && (
                      <p className="mt-2 text-xs text-muted-foreground">Dashed: no taste profile yet, so it doesn’t change the chart.</p>
                    )}
                  </>
                )}
                <form onSubmit={add} className="mt-3 flex max-w-md gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add ingredients, e.g. lime, fish sauce"
                    aria-label="Add ingredients, separated by commas"
                    list="photo-known"
                  />
                  <datalist id="photo-known">
                    {KNOWN_INGREDIENTS.map((k) => <option key={k} value={k} />)}
                  </datalist>
                  <Button type="submit" variant="outline" disabled={!draft.trim()}>Add</Button>
                </form>
              </div>
            </section>

            <section className="mt-12" aria-labelledby="closest-title">
              <h2 id="closest-title" className="text-2xl font-bold">Recipes that taste like it</h2>
              {!enough ? (
                <p className="mt-1 text-muted-foreground">Once three or more ingredients are known, the closest recipes show up here.</p>
              ) : (
                <>
                  <p className="mt-1 text-muted-foreground">Closest by taste, not by name: these may be different dishes that hit the same notes.</p>
                  <ul className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                    {closest.map((r) => <li key={r.id}><RecipeCard recipe={r} /></li>)}
                  </ul>
                </>
              )}
            </section>
          </div>

          <aside className="order-first lg:order-none">
            <div className="rounded-lg border bg-card p-5 lg:sticky lg:top-20">
              <h2 className="text-lg font-semibold">How it tastes</h2>
              <p className="text-sm text-muted-foreground">
                {enough ? `${describeProfile(profile.vector)}.` : 'Waiting for at least three ingredients.'}
              </p>
              <div className="mt-2 flex justify-center">
                <FlavorRadar values={profile.vector} size={280} />
              </div>
              <p className="mt-2 border-t pt-3 text-sm text-muted-foreground">
                An estimate from the ingredients{reading ? ' the assistant could make out' : ''}, not from the photo itself. Amounts and cooking can’t be seen, so treat it as a sketch.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Photo;
