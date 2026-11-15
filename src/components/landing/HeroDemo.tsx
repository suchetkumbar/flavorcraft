import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import { computeProfile } from '@/lib/flavor/profile';
import { ORIGINAL_RECIPES } from '@/lib/recipes/originals';
import { TASTES, describeProfile } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';

/** Three dishes with very different shapes, so the morph shows what the chart means. */
const DEMO_IDS = ['fc-tamarind-chilli-prawns', 'fc-bitter-greens-anchovy', 'fc-salted-honey-panna-cotta'];

/**
 * The landing page's one moving element: the radar morphs between real
 * recipes. Auto-advances unless the visitor prefers reduced motion or picks one.
 */
const HeroDemo = () => {
  const reduceMotion = useReducedMotion();
  const dishes = useMemo(
    () =>
      DEMO_IDS.map((id) => ORIGINAL_RECIPES.find((r) => r.id === id)!).map((r) => ({
        ...r,
        profile: computeProfile(r.ingredients),
      })),
    [],
  );
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % dishes.length), 3200);
    return () => clearInterval(id);
  }, [reduceMotion, paused, dishes.length]);

  const dish = dishes[active];
  const top = TASTES.map((t, i) => ({ ...t, v: dish.profile.vector[i], src: dish.profile.sources[i][0] }))
    .filter((t) => t.v >= 5 && t.src)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2);

  return (
    <figure className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Example dishes">
        {dishes.map((d, i) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              i === active ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            {d.title}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-center">
        <FlavorRadar values={dish.profile.vector} size={320} />
      </div>
      <figcaption className="min-h-[3.5rem] text-sm" aria-live="polite">
        <span className="font-medium">{describeProfile(dish.profile.vector)}.</span>{' '}
        {top.map((t, i) => (
          <span key={t.key} className="text-muted-foreground">
            {i === 0 ? '' : ' '}
            {t.label} comes from the {t.src.toLowerCase()}.
          </span>
        ))}{' '}
        <Link to={`/recipes/${dish.id}`} className="whitespace-nowrap underline underline-offset-2">
          See the recipe
        </Link>
      </figcaption>
    </figure>
  );
};

export default HeroDemo;
