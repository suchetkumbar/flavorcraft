import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import RecipeCard from '@/components/RecipeCard';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { leftoverCandidates, listWords, leftoverIdeas } from '@/lib/cook/leftovers';
import { useKitchen } from '@/lib/kitchen/store';
import { usePantry } from '@/lib/pantry/store';
import { cn } from '@/lib/utils';

const changeWords = (change: number) =>
  change >= 60 ? 'tastes very different from what you made' : change >= 35 ? 'a change from what you made' : 'similar in taste to what you made';

const Leftovers = () => {
  const { data, isLoading } = useCatalog();
  const [params] = useSearchParams();
  const fromId = params.get('from');
  const cooks = useKitchen((s) => s.cooks);
  const addToPantry = usePantry((s) => s.add);
  const recipes = useMemo(() => data?.recipes ?? [], [data]);
  const cooked = recipes.find((r) => r.id === fromId);
  useDocumentTitle(cooked ? `Use up what’s left from ${cooked.title}` : 'Use up what’s left');

  const candidates = useMemo(() => (cooked ? leftoverCandidates(cooked) : []), [cooked]);
  // Everything is assumed left over until the cook says otherwise.
  const [gone, setGone] = useState<Set<string>>(new Set());
  const left = useMemo(() => candidates.filter((c) => !gone.has(c)), [candidates, gone]);
  const ideas = useMemo(() => (cooked ? leftoverIdeas(cooked, left, recipes) : []), [cooked, left, recipes]);

  // Recently cooked dishes with something likely left over, for when no dish is chosen.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    return cooks
      .map((c) => recipes.find((r) => r.id === c.recipeId))
      .filter((r): r is NonNullable<typeof r> => {
        if (!r || seen.has(r.id) || leftoverCandidates(r).length === 0) return false;
        seen.add(r.id);
        return true;
      })
      .slice(0, 6);
  }, [cooks, recipes]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Use up what’s left</h1>
        {isLoading ? (
          <div className="mt-8 h-40 animate-pulse rounded-xl bg-muted" />
        ) : !cooked ? (
          <>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Half a bunch of coriander, the rest of the cream: pick a dish you cooked, and see what else uses the fresh
              ingredients it left behind.
            </p>
            {recent.length > 0 ? (
              <ul className="mt-8 grid gap-6 sm:grid-cols-2">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link to={`/leftovers?from=${r.id}`} className="block rounded-lg border bg-card p-4 hover:border-foreground">
                      <span className="block text-lg font-semibold">{r.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">Likely left: {listWords(leftoverCandidates(r))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Nothing in your cooking log has leftovers to use up yet.</p>
                <p className="mt-1 text-muted-foreground">Open any recipe, cook it, and this page will pick up from there.</p>
                <Button asChild className="mt-4"><Link to="/recipes">Browse recipes</Link></Button>
              </div>
            )}
          </>
        ) : candidates.length === 0 ? (
          <>
            <p className="mt-2 max-w-xl text-muted-foreground">
              <Link to={`/recipes/${cooked.id}`} className="underline underline-offset-2">{cooked.title}</Link> uses things that keep
              (dried spices, tins, staples), so there’s nothing here that needs using up soon.
            </p>
            <Button asChild variant="outline" className="mt-6"><Link to="/pantry">Cook with what you have</Link></Button>
          </>
        ) : (
          <>
            <p className="mt-2 max-w-xl text-muted-foreground">
              After <Link to={`/recipes/${cooked.id}`} className="underline underline-offset-2">{cooked.title}</Link>, these are the
              fresh ingredients you probably have some of. Turn off any you finished.
            </p>
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="What you have left">
              {candidates.map((c) => {
                const on = !gone.has(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setGone((prev) => {
                        const next = new Set(prev);
                        if (on) next.add(c);
                        else next.delete(c);
                        return next;
                      })
                    }
                    className={cn(
                      'rounded-full border px-4 py-1.5 capitalize transition-colors',
                      on ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground line-through hover:bg-muted',
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {left.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  addToPantry(left);
                  toast.success(`Added ${listWords(left)} to your pantry`);
                }}
              >
                Add these to my pantry
              </Button>
            )}

            <h2 className="mt-10 text-2xl font-bold">Dishes that use them</h2>
            <p className="mt-1 text-muted-foreground">Those using the most come first, then the ones that taste least like what you just ate.</p>
            {ideas.length ? (
              <ul className="mt-2 divide-y border-y">
                {ideas.map((idea) => (
                  <li key={idea.recipe.id} className="py-5">
                    <RecipeCard recipe={idea.recipe} layout="row" />
                    <p className="mt-2 text-sm sm:pl-[156px]">
                      <span className="font-medium">Uses your {listWords(idea.uses)}</span>
                      <span className="text-muted-foreground">; {changeWords(idea.change)}.</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                {left.length === 0 ? 'Nothing left over, so nothing to use up.' : 'No other recipe in the catalog uses these.'}
              </p>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Leftovers;
