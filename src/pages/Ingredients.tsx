import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buildPairingIndex } from '@/lib/flavor/pairings';
import { matchIngredient } from '@/lib/flavor/ingredients';
import { ingredientSlug } from '@/lib/flavor/ingredientInfo';
import { TASTES, dominantIndex } from '@/lib/flavor/tastes';

/** Index of ingredients that appear in at least a few recipes, grouped by their strongest taste. */
const Ingredients = () => {
  useDocumentTitle('Ingredients');
  const { data, isLoading } = useCatalog();
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    if (!data) return [];
    const index = buildPairingIndex(data.recipes);
    const items = [...index.byIngredient.entries()]
      .filter(([, ids]) => ids.size >= 3)
      .map(([name, ids]) => {
        const v = matchIngredient(name)?.vector;
        const taste = v && v[dominantIndex(v)] > 2 ? dominantIndex(v) : -1;
        return { name, count: ids.size, taste };
      });
    return [...TASTES.map((t, i) => ({ title: t.label, color: t.color, items: items.filter((x) => x.taste === i) })), {
      title: 'Mostly neutral or not yet profiled',
      color: 'hsl(var(--border))',
      items: items.filter((x) => x.taste === -1),
    }].map((g) => ({ ...g, items: g.items.sort((a, b) => b.count - a.count) }));
  }, [data]);

  const query = q.trim().toLowerCase();
  const shown = groups.map((g) => ({ ...g, items: query ? g.items.filter((x) => x.name.includes(query)) : g.items })).filter((g) => g.items.length);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Ingredients</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Every ingredient grouped by the taste it brings most. Open one to see what it pairs with, what can replace it,
          and the dishes where it’s the star.
        </p>
        <div className="relative mt-6 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an ingredient" className="pl-9" aria-label="Find an ingredient" />
        </div>

        {isLoading && <p className="mt-8 text-muted-foreground">Loading ingredients…</p>}
        {!isLoading && shown.length === 0 && <p className="mt-8 text-muted-foreground">No ingredient matches “{q}”.</p>}

        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((g) => (
            <section key={g.title} aria-labelledby={`group-${g.title}`}>
              <h2 id={`group-${g.title}`} className="flex items-center gap-2 border-b pb-2 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} aria-hidden />
                {g.title}
                <span className="font-normal text-muted-foreground">({g.items.length})</span>
              </h2>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
                {g.items.slice(0, query ? undefined : 40).map((x) => (
                  <li key={x.name}>
                    <Link to={`/ingredients/${ingredientSlug(x.name)}`} className="capitalize hover:underline hover:underline-offset-4">
                      {x.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Ingredients;
