import { useMemo, useState } from 'react';
import { drinkPairings } from '@/lib/flavor/drinks';
import type { TasteVector } from '@/lib/flavor/tastes';

const KEY = 'flavorcraft:drinks:no-alcohol';

const readPreference = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** Drinks chosen from the dish's taste profile: two that balance it, one that echoes it. */
const DrinkPairings = ({ vector }: { vector: TasteVector }) => {
  const [noAlcohol, setNoAlcohol] = useState(readPreference);
  const picks = useMemo(() => drinkPairings(vector, { alcohol: !noAlcohol }), [vector, noAlcohol]);
  if (picks.length === 0) return null;

  const toggle = (checked: boolean) => {
    setNoAlcohol(checked);
    try {
      localStorage.setItem(KEY, checked ? '1' : '0');
    } catch {
      // The choice just won't be remembered.
    }
  };

  return (
    <section className="mt-12" aria-labelledby="drinks">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="drinks" className="text-2xl font-bold">Drink with it</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={noAlcohol}
            onChange={(e) => toggle(e.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--foreground))]"
          />
          No alcohol
        </label>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Picked from how the dish tastes{noAlcohol ? '' : ', with at least one alcohol-free choice'}. They follow your remix as you change it.
      </p>
      <ul className="mt-2 divide-y border-y" aria-live="polite">
        {picks.map(({ drink, reason, how }) => (
          <li key={drink.name} className="grid gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[14rem_1fr]">
            <div>
              <span className="font-medium">{drink.name}</span>
              <span className="block text-sm text-muted-foreground">{drink.style}</span>
            </div>
            <p className="text-sm sm:pt-0.5">
              <span className="text-muted-foreground">{how === 'balance' ? 'Balances it. ' : 'Goes the same way. '}</span>
              {reason}.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default DrinkPairings;
