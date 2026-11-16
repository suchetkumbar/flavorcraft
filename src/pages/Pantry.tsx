import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import RecipeCard from '@/components/RecipeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buildPairingIndex, canonicalName, popularIngredients } from '@/lib/flavor/pairings';
import { matchPantry, type PantryMatch } from '@/lib/pantry/match';
import { usePantry } from '@/lib/pantry/store';
import PantryPhoto from '@/components/PantryPhoto';
import AuthDialog from '@/components/kitchen/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { accountsEnabled } from '@/lib/supabase';

const LIMIT = 12;

const MatchRow = ({ match }: { match: PantryMatch }) => {
  const total = match.have.length + match.missing.length + match.swaps.length;
  return (
    <li className="py-5">
      <RecipeCard recipe={match.recipe} layout="row" />
      <div className="mt-3 space-y-1 text-sm sm:pl-[156px]">
        <p>
          <span className="font-medium">You have {match.have.length} of {total}</span>
          <span className="text-muted-foreground"> (not counting salt, oil and other staples)</span>
        </p>
        {match.swaps.map((s) => (
          <p key={s.missing}>
            Use <span className="font-medium">{s.use}</span> instead of {s.missing.toLowerCase()}
            <span className="text-muted-foreground">: {s.why}</span>
          </p>
        ))}
        {match.missing.length > 0 && (
          <p>
            <span className="text-muted-foreground">You’d need: </span>
            {match.missing.join(', ')}
          </p>
        )}
      </div>
    </li>
  );
};

const Pantry = () => {
  useDocumentTitle('Cook with what you have');
  const { data, isLoading } = useCatalog();
  const { items, ownerId, add, remove, clear } = usePantry();
  const [draft, setDraft] = useState('');
  const [limit, setLimit] = useState(LIMIT);
  const signedIn = useAuth((s) => s.user !== null);
  const [authOpen, setAuthOpen] = useState(false);

  const index = useMemo(() => (data ? buildPairingIndex(data.recipes) : null), [data]);
  const known = useMemo(() => (index ? [...index.byIngredient.keys()].sort() : []), [index]);
  const pantryKeys = useMemo(() => new Set(items.map(canonicalName)), [items]);
  const suggestions = useMemo(
    () => (index ? popularIngredients(index, 40).filter((n) => !pantryKeys.has(n)).slice(0, 14) : []),
    [index, pantryKeys],
  );
  const matches = useMemo(() => (data ? matchPantry(data.recipes, items) : []), [data, items]);
  const ready = matches.filter((m) => m.missing.length === 0);
  const almost = matches.filter((m) => m.missing.length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept a pasted list: "eggs, rice, spring onion".
    add(draft.split(/[,;\n]/));
    setDraft('');
    setLimit(LIMIT);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Cook with what you have</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          List what’s in your kitchen. FlavorCraft finds recipes you can make, and when you’re missing
          something, suggests what you already have that does the same job for taste.
        </p>

        <section className="mt-8 rounded-xl border bg-card p-5" aria-labelledby="pantry-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="pantry-title" className="text-lg font-semibold">Your pantry</h2>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear}>Clear all</Button>
            )}
          </div>
          <form onSubmit={submit} className="mt-3 flex max-w-xl gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add ingredients, e.g. eggs, rice, spring onion"
              aria-label="Add ingredients, separated by commas"
              list="pantry-known"
            />
            <datalist id="pantry-known">
              {known.map((k) => <option key={k} value={k} />)}
            </datalist>
            <Button type="submit" disabled={!draft.trim()}>Add</Button>
          </form>

          {items.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="In your pantry">
              {items.map((item) => (
                <li key={item}>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background py-1 pl-3 pr-1 text-sm">
                    {item}
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remove ${item}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nothing yet. Add a few things, or tap the common ones below.</p>
          )}

          {suggestions.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="text-sm font-medium">Common ingredients</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => add([name])}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm capitalize hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden /> {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {accountsEnabled && (
            <PantryPhoto
              have={pantryKeys}
              signedIn={signedIn}
              onSignIn={() => setAuthOpen(true)}
              onAdd={(names) => {
                add(names);
                setLimit(LIMIT);
              }}
            />
          )}
          <p className="mt-4 text-xs text-muted-foreground">{ownerId ? 'Synced to your account.' : 'Saved on this device. Sign in to keep it across devices.'}</p>
        </section>

        <section className="mt-12" aria-live="polite" aria-labelledby="results-title">
          <h2 id="results-title" className="sr-only">Recipes you can make</h2>
          {isLoading && <p className="text-muted-foreground">Loading recipes…</p>}
          {!isLoading && items.length > 0 && matches.length === 0 && (
            <div className="rounded-lg border border-dashed px-6 py-10">
              <p className="font-medium">No recipes are within three ingredients of your pantry yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a main ingredient or two, like a protein, a vegetable or a grain, and the matches will open up.
              </p>
            </div>
          )}

          {ready.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold">Ready to cook ({ready.length})</h3>
              <ul className="mt-2 divide-y border-y">
                {ready.slice(0, limit).map((m) => <MatchRow key={m.recipe.id} match={m} />)}
              </ul>
            </div>
          )}

          {almost.length > 0 && (
            <div className={ready.length ? 'mt-12' : ''}>
              <h3 className="text-2xl font-bold">Missing a few things ({almost.length})</h3>
              <p className="mt-1 text-sm text-muted-foreground">Fewest missing ingredients first.</p>
              <ul className="mt-2 divide-y border-y">
                {almost.slice(0, limit).map((m) => <MatchRow key={m.recipe.id} match={m} />)}
              </ul>
            </div>
          )}

          {(ready.length > limit || almost.length > limit) && (
            <div className="mt-8 text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + LIMIT)}>Show more recipes</Button>
            </div>
          )}

          {items.length === 0 && !isLoading && (
            <p className="text-muted-foreground">
              Or <Link to="/recipes" className="underline underline-offset-2">browse all recipes by taste</Link>.
            </p>
          )}
        </section>
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Pantry;
