import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import RecipeCard from '@/components/RecipeCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/hooks/useRecipes';
import { buildPairingIndex, canonicalName, pairingsFor, popularIngredients } from '@/lib/flavor/pairings';
import { TASTES } from '@/lib/flavor/tastes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const Pairings = () => {
  const { data, isLoading } = useCatalog();
  const [params, setParams] = useSearchParams();
  const selected = params.get('i') ?? '';
  useDocumentTitle(selected ? `What goes with ${selected}` : 'Pairings');
  const [draft, setDraft] = useState(selected);

  const index = useMemo(() => (data ? buildPairingIndex(data.recipes) : null), [data]);
  const popular = useMemo(() => (index ? popularIngredients(index, 32) : []), [index]);
  const pairings = useMemo(() => (index && selected ? pairingsFor(index, selected, 30) : []), [index, selected]);

  const groups = useMemo(() => {
    const byTaste = TASTES.map((t, i) => ({ taste: t, items: pairings.filter((p) => p.taste === i) }));
    const other = pairings.filter((p) => p.taste === -1);
    return { byTaste: byTaste.filter((g) => g.items.length), other };
  }, [pairings]);

  const recipesWith = useMemo(() => {
    if (!index || !selected) return [];
    const ids = index.byIngredient.get(canonicalName(selected));
    return data!.recipes.filter((r) => ids?.has(r.id)).slice(0, 6);
  }, [index, selected, data]);
  const totalWith = index && selected ? index.byIngredient.get(canonicalName(selected))?.size ?? 0 : 0;

  const choose = (name: string) => {
    setDraft(name);
    setParams(name ? { i: name } : {}, { replace: false });
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">What goes with…</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Choose an ingredient to see what cooks pair it with most often across{' '}
          {data ? data.recipes.length : 'hundreds of'} recipes, grouped by the taste each partner brings.
        </p>

        <form
          className="mt-8 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            choose(draft.trim());
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. lemon, mushroom, ginger"
            aria-label="Ingredient"
            list="popular-ingredients"
          />
          <datalist id="popular-ingredients">
            {index && [...index.byIngredient.keys()].map((k) => <option key={k} value={k} />)}
          </datalist>
          <Button type="submit" disabled={!draft.trim()}>Show pairings</Button>
        </form>

        {!selected && (
          <div className="mt-8">
            <p className="text-sm font-medium">Try one of these</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {isLoading && <span className="text-sm text-muted-foreground">Loading ingredients…</span>}
              {popular.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => choose(name)}
                  className="rounded-full border px-3 py-1 text-sm capitalize hover:bg-muted"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && index && (
          <section className="mt-10" aria-live="polite">
            <h2 className="text-2xl font-bold capitalize">{canonicalName(selected)}</h2>
            {pairings.length === 0 ? (
              <p className="mt-2 text-muted-foreground">
                No recipes in the catalog use “{selected}”. Check the spelling, or choose one of the
                suggestions in the search box.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Appears in {totalWith} recipes. Stronger pairings are listed first in each group.
                </p>
                <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                  {groups.byTaste.map(({ taste, items }) => (
                    <PairGroup key={taste.key} title={`Adds ${taste.label.toLowerCase()}`} color={taste.color} items={items} onPick={choose} />
                  ))}
                  {groups.other.length > 0 && (
                    <PairGroup title="Other" color="hsl(var(--border))" items={groups.other} onPick={choose} />
                  )}
                </div>
              </>
            )}

            {recipesWith.length > 0 && (
              <div className="mt-14">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-2xl font-bold">Recipes using it</h2>
                  <Link to={`/recipes?q=${encodeURIComponent(canonicalName(selected))}`} className="text-sm underline underline-offset-2">
                    See all {totalWith}
                  </Link>
                </div>
                <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {recipesWith.map((r) => <RecipeCard key={r.id} recipe={r} />)}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

const PairGroup = ({
  title,
  color,
  items,
  onPick,
}: {
  title: string;
  color: string;
  items: { name: string; together: number; strength: number }[];
  onPick: (name: string) => void;
}) => {
  const max = Math.max(...items.map((p) => p.strength));
  return (
    <div>
      <h3 className="flex items-center gap-2 border-b pb-2 font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
        {title}
      </h3>
      <ul className="mt-2 space-y-1">
        {items.map((p) => (
          <li key={p.name}>
            <button
              type="button"
              onClick={() => onPick(p.name)}
              className="group flex w-full items-center gap-3 rounded px-1 py-1 text-left text-sm hover:bg-muted"
              title={`Used together in ${p.together} recipes`}
            >
              <span className="flex-1 capitalize group-hover:underline">{p.name}</span>
              <span className="h-1.5 rounded-full" style={{ width: `${Math.max(8, (p.strength / max) * 56)}px`, background: color }} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Pairings;
