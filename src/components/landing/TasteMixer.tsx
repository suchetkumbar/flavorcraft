import { useMemo, useState } from 'react';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import RecipeCard from '@/components/RecipeCard';
import { useCatalog } from '@/hooks/useRecipes';
import { TASTES, distance, type TasteVector } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';

const PRESETS: { label: string; vector: TasteVector }[] = [
  { label: 'Bright and spicy', vector: [2, 4, 7, 1, 3, 7, 2, 7] },
  { label: 'Deep and savory', vector: [2, 6, 2, 2, 8, 2, 5, 5] },
  { label: 'Rich comfort', vector: [4, 4, 1, 1, 5, 1, 8, 4] },
  { label: 'Sweet and sharp', vector: [8, 1, 6, 1, 1, 0, 4, 5] },
];

/** Eight taste sliders, a live radar, and the closest dishes in the catalog. */
const TasteMixer = () => {
  const { data, isLoading } = useCatalog();
  const [target, setTarget] = useState<TasteVector>(PRESETS[0].vector);
  const [preset, setPreset] = useState<number | null>(0);

  const matches = useMemo(() => {
    if (!data) return [];
    return [...data.recipes]
      .filter((r) => r.flavor.matched >= 3)
      .map((r) => ({ r, d: distance(r.flavor.vector, target) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4)
      .map((x) => x.r);
  }, [data, target]);

  const setValue = (i: number, value: number) => {
    setTarget((prev) => prev.map((v, j) => (j === i ? value : v)) as TasteVector);
    setPreset(null);
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Starting points">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={preset === i}
              onClick={() => {
                setTarget(p.vector);
                setPreset(i);
              }}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                preset === i ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {TASTES.map((t, i) => (
            <label key={t.key} className="block">
              <span className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{t.label}</span>
                <span className="text-muted-foreground">{t.hint}</span>
              </span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={target[i]}
                onChange={(e) => setValue(i, Number(e.target.value))}
                className="taste-range"
                style={{ '--taste': t.color, '--fill': `${target[i] * 10}%` } as React.CSSProperties}
                aria-valuetext={`${t.label} ${target[i]} out of 10`}
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-center lg:justify-start">
          <FlavorRadar values={target} size={300} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium">Closest dishes</h3>
        <div className="mt-3 space-y-4" aria-live="polite">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />)}
          {matches.map((r) => (
            <RecipeCard key={r.id} recipe={r} layout="row" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TasteMixer;
