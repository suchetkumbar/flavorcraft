import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
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

const tools = [
  {
    title: 'See how a recipe tastes',
    body: 'Every recipe gets a profile across eight tastes, with the ingredients behind each one.',
    to: '/recipes',
    cta: 'Browse recipes',
  },
  {
    title: 'Remix it and watch it change',
    body: 'Drop the cream, add lime, swap the chilli. The chart updates as you edit, next to the original.',
    to: '/recipes/fc-smoky-black-bean-chilli',
    cta: 'Remix the black bean chilli',
  },
  {
    title: 'Fix a dish that isn’t working',
    body: 'Too salty, flat, too heavy? Get fixes ranked for that recipe, with amounts and the reason each one works.',
    to: '/recipes/fc-brown-butter-sage-squash',
    cta: 'Try it on brown butter squash',
  },
  {
    title: 'Find what goes with an ingredient',
    body: 'Pairings come from what cooks actually combine across hundreds of recipes, grouped by the taste each one adds.',
    to: '/pairings?i=lemon',
    cta: 'What goes with lemon',
  },
];

const Index = () => {
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
    <div className="min-h-screen">
      <Navigation />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:pt-16" aria-labelledby="hero-title">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div>
              <h1
                id="hero-title"
                className="text-[clamp(3rem,8vw,6.25rem)] font-extrabold leading-[0.92]"
                style={{ fontVariationSettings: '"wdth" 75' }}
              >
                Cook by taste.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
                Set how sweet, sour, salty or hot you want dinner to be. FlavorCraft finds the dishes
                closest to that balance.
              </p>

              <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Starting points">
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
            </div>

            <div className="lg:pt-4">
              <div className="flex justify-center">
                <FlavorRadar values={target} size={340} />
              </div>
              <h2 className="mt-6 text-sm font-medium">Closest dishes</h2>
              <div className="mt-3 space-y-4" aria-live="polite">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />)}
                {matches.map((r) => (
                  <RecipeCard key={r.id} recipe={r} layout="row" />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t" aria-labelledby="tools-title">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="tools-title" className="max-w-lg text-3xl font-bold sm:text-4xl">
              Built around what a dish tastes like, not just what’s in it
            </h2>
            <dl className="mt-10 divide-y border-y">
              {tools.map((tool) => (
                <div key={tool.title} className="grid gap-2 py-6 md:grid-cols-[1fr_1.4fr_auto] md:items-baseline md:gap-8">
                  <dt className="text-xl font-semibold">{tool.title}</dt>
                  <dd className="max-w-prose text-muted-foreground">{tool.body}</dd>
                  <dd>
                    <Link to={tool.to} className="text-sm font-medium underline underline-offset-4 hover:no-underline">
                      {tool.cta}
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
