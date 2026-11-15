import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RecipeCard from './RecipeCard';
import { useCatalog } from '@/hooks/useRecipes';
import { TASTES, TASTE_KEYS, type TasteKey } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';

const PAGE = 24;
const ALL = 'all';

type Sort = 'taste' | 'az' | 'fewest';

const RecipeGrid = () => {
  const { data, isLoading } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState(ALL);
  const [area, setArea] = useState(ALL);
  const [sort, setSort] = useState<Sort>('taste');
  const [limit, setLimit] = useState(PAGE);

  const tasteParam = params.get('taste') ?? '';
  const tastes = useMemo(
    () => tasteParam.split(',').filter((t): t is TasteKey => TASTE_KEYS.includes(t as TasteKey)),
    [tasteParam],
  );

  const toggleTaste = (key: TasteKey) => {
    const next = tastes.includes(key) ? tastes.filter((t) => t !== key) : [...tastes, key];
    const p = new URLSearchParams(params);
    if (next.length) p.set('taste', next.join(','));
    else p.delete('taste');
    setParams(p, { replace: true });
    setLimit(PAGE);
  };

  const recipes = useMemo(() => data?.recipes ?? [], [data]);
  const categories = useMemo(() => [...new Set(recipes.map((r) => r.category))].sort(), [recipes]);
  const areas = useMemo(() => [...new Set(recipes.map((r) => r.area))].filter((a) => a !== 'Unknown').sort(), [recipes]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const idx = tastes.map((t) => TASTE_KEYS.indexOf(t));
    const filtered = recipes.filter(
      (r) =>
        (category === ALL || r.category === category) &&
        (area === ALL || r.area === area) &&
        idx.every((i) => r.flavor.vector[i] >= 5) &&
        (!q ||
          r.title.toLowerCase().includes(q) ||
          r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))),
    );
    const tasteScore = (v: number[]) => idx.reduce((s, i) => s + v[i], 0);
    return [...filtered].sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title);
      if (sort === 'fewest') return a.ingredients.length - b.ingredients.length;
      if (idx.length) return tasteScore(b.flavor.vector) - tasteScore(a.flavor.vector);
      return 0;
    });
  }, [recipes, query, category, area, tastes, sort]);

  const clearAll = () => {
    setQuery('');
    setCategory(ALL);
    setArea(ALL);
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Recipes</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Pick the tastes you're in the mood for. Each recipe's colored band shows its flavor balance.
      </p>

      {data && !data.online && (
        <p className="mt-4 rounded-md border px-4 py-3 text-sm">
          TheMealDB can't be reached right now, so only FlavorCraft originals are shown. Check your
          connection and reload the page to see the full catalog.
        </p>
      )}

      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-medium">Tastes</legend>
        <div className="flex flex-wrap gap-2">
          {TASTES.map((t) => {
            const on = tastes.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTaste(t.key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                  on ? 'font-semibold' : 'hover:bg-muted',
                )}
                style={on ? { background: `${t.color}2E`, borderColor: t.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search by dish or ingredient"
            className="pl-9"
            aria-label="Search by dish or ingredient"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setLimit(PAGE); }}>
          <SelectTrigger className="sm:w-44" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={(v) => { setArea(v); setLimit(PAGE); }}>
          <SelectTrigger className="sm:w-44" aria-label="Cuisine">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cuisines</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="sm:w-44" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="taste">Strongest match</SelectItem>
            <SelectItem value="az">A to Z</SelectItem>
            <SelectItem value="fewest">Fewest ingredients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {isLoading ? 'Loading recipes…' : `${results.length} recipes`}
      </p>

      {isLoading ? (
        <div className="mt-4 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="mt-4 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, limit).map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
          {results.length > limit && (
            <div className="mt-12 text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, results.length - limit)} more
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="font-medium">No recipes match all of these filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">Remove a taste or clear the search to see more.</p>
          <Button variant="outline" className="mt-4" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecipeGrid;
