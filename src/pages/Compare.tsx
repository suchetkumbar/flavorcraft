import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, ChefHat } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { compareProfiles, explainDifferences, similarity } from '@/lib/flavor/compare';
import { TASTES } from '@/lib/flavor/tastes';
import { planTogether, roughDuration } from '@/lib/cook/together';
import type { ProfiledRecipe } from '@/lib/recipes/types';

/** Search box that resolves a typed title to a recipe from the catalog. */
const RecipePicker = ({
  label,
  recipes,
  value,
  onPick,
}: {
  label: string;
  recipes: ProfiledRecipe[];
  value: ProfiledRecipe | undefined;
  onPick: (id: string) => void;
}) => {
  const [text, setText] = useState(value?.title ?? '');
  const listId = `${label.replace(/\W/g, '')}-recipes`;
  const pick = (title: string) => {
    const match = recipes.find((r) => r.title.toLowerCase() === title.trim().toLowerCase());
    if (match) onPick(match.id);
  };
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={listId + '-input'}>{label}</label>
      <Input
        id={listId + '-input'}
        className="mt-1"
        value={text}
        list={listId}
        placeholder="Type a recipe name"
        onChange={(e) => {
          setText(e.target.value);
          pick(e.target.value);
        }}
      />
      <datalist id={listId}>
        {recipes.map((r) => <option key={r.id} value={r.title} />)}
      </datalist>
    </div>
  );
};

const Compare = () => {
  const { data, isLoading } = useCatalog();
  const [params, setParams] = useSearchParams();
  const aId = params.get('a') ?? '';
  const bId = params.get('b') ?? '';
  const recipes = useMemo(() => data?.recipes ?? [], [data]);
  const a = recipes.find((r) => r.id === aId);
  const b = recipes.find((r) => r.id === bId);
  useDocumentTitle(a && b ? `${a.title} vs ${b.title}` : 'Compare dishes');

  const set = (key: 'a' | 'b', id: string) => {
    const next = new URLSearchParams(params);
    next.set(key, id);
    setParams(next, { replace: true });
  };

  const diffs = useMemo(() => (a && b ? compareProfiles(a.flavor, b.flavor) : []), [a, b]);
  const sentences = a && b ? explainDifferences(a.title, b.title, diffs, 4) : [];
  const score = a && b ? similarity(a.flavor, b.flavor) : null;

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Compare two dishes</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">See how two recipes differ in taste, and which ingredients make the difference.</p>

        {isLoading ? (
          <div className="mt-8 h-24 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="mt-8 grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
            {/* Keyed so the text resets when the URL changes, e.g. after swapping sides. */}
            <RecipePicker key={`a-${aId}`} label="First dish" recipes={recipes} value={a} onPick={(id) => set('a', id)} />
            <Button
              variant="outline"
              size="icon"
              aria-label="Swap the two dishes"
              disabled={!a && !b}
              onClick={() => setParams(new URLSearchParams({ ...(b && { a: b.id }), ...(a && { b: a.id }) }), { replace: true })}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <RecipePicker key={`b-${bId}`} label="Second dish" recipes={recipes} value={b} onPick={(id) => set('b', id)} />
          </div>
        )}

        {a && b ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-[360px_1fr]">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex justify-center">
                <FlavorRadar values={a.flavor.vector} compare={b.flavor.vector} compareLabel={b.title} size={300} />
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="2" /></svg>
                  <Link to={`/recipes/${a.id}`} className="underline underline-offset-2">{a.title}</Link>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                  <Link to={`/recipes/${b.id}`} className="underline underline-offset-2">{b.title}</Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-2xl font-bold">
                {score! >= 85 ? 'Very similar' : score! >= 70 ? 'Fairly similar' : score! >= 55 ? 'Quite different' : 'Very different'}
                <span className="ml-2 text-base font-normal text-muted-foreground">({score}% alike)</span>
              </p>
              {sentences.length ? (
                <ul className="mt-4 space-y-2 text-lg">
                  {sentences.map((s) => <li key={s}>{s}</li>)}
                </ul>
              ) : (
                <p className="mt-4 text-lg">These two taste almost the same: no taste differs by more than a point.</p>
              )}

              <table className="mt-8 w-full text-sm">
                <caption className="sr-only">Taste scores for both dishes, out of 10</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 font-medium">Taste</th>
                    <th className="py-2 font-medium">{a.title}</th>
                    <th className="py-2 font-medium">{b.title}</th>
                  </tr>
                </thead>
                <tbody>
                  {TASTES.map((t, i) => (
                    <tr key={t.key} className="border-b">
                      <td className="py-2">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
                          {t.label}
                        </span>
                      </td>
                      {[a, b].map((r) => (
                        <td key={r.id} className="py-2">
                          <span className="flex items-center gap-2 tabular-nums">
                            <span className="h-1.5 rounded-full" style={{ width: `${r.flavor.vector[i] * 8}px`, background: t.color }} aria-hidden />
                            {r.flavor.vector[i].toFixed(1)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button asChild variant="outline">
                  <Link to={`/cook/${a.id}?with=${b.id}`}>
                    <ChefHat className="mr-2 h-4 w-4" /> Cook both together
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  One merged order of steps, {roughDuration(planTogether(a.steps, b.steps).total)} in all.
                </p>
              </div>
            </div>
          </div>
        ) : (
          !isLoading && (
            <p className="mt-10 text-muted-foreground">
              Pick two dishes above. You can also start from any recipe page with <span className="font-medium">Compare</span>.
            </p>
          )
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Compare;
