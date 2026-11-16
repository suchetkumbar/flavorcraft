import { useState } from 'react';
import { Check } from 'lucide-react';
import { PROBLEMS, fixesFor, type DishProblem } from '@/lib/flavor/fixes';
import type { TasteVector } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';

interface TasteCheckProps {
  /** The dish's taste profile, used to rank the fixes. */
  vector: TasteVector;
  heading?: string;
  /** Why now, e.g. "Flavors concentrate as liquid cooks down…". */
  reason?: string;
  /** A reminder from the cook's seasoning hand. */
  hint?: string | null;
  /** Problems found so far at this point. */
  picked: DishProblem[];
  onChange: (problems: DishProblem[]) => void;
}

const chip = 'rounded-full border px-4 py-2 text-base transition-colors';

/** "Taste it now": pick what's off and get the fix on the spot, mid-cook. */
const TasteCheck = ({ vector, heading = 'Taste it now', reason, hint, picked, onChange }: TasteCheckProps) => {
  const [fine, setFine] = useState(false);
  const [showing, setShowing] = useState<DishProblem | null>(picked[picked.length - 1] ?? null);
  const fixes = showing ? fixesFor(showing, vector).slice(0, 2) : [];

  const toggle = (p: DishProblem) => {
    setFine(false);
    if (picked.includes(p)) {
      const rest = picked.filter((x) => x !== p);
      onChange(rest);
      setShowing(rest[rest.length - 1] ?? null);
    } else {
      onChange([...picked, p]);
      setShowing(p);
    }
  };

  return (
    <section className="mt-10 rounded-xl border bg-card p-5 sm:p-6" aria-label={heading}>
      <h2 className="text-xl font-semibold">{heading}</h2>
      {(reason || hint) && (
        <p className="mt-1 text-muted-foreground">
          {reason} {hint}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={fine}
          onClick={() => {
            setFine(true);
            setShowing(null);
            onChange([]);
          }}
          className={cn(chip, fine ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted')}
        >
          {fine && <Check className="mr-1.5 inline h-4 w-4" aria-hidden />}
          Tastes right
        </button>
        {PROBLEMS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={picked.includes(p.id)}
            onClick={() => toggle(p.id)}
            className={cn(chip, picked.includes(p.id) ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted')}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {fine && <p className="mt-4 text-lg">Good. Carry on.</p>}
        {showing && (
          <div className="mt-5">
            <p className="text-sm font-medium text-muted-foreground">
              {PROBLEMS.find((p) => p.id === showing)?.label}: try this first
            </p>
            <ul className="mt-2 divide-y border-y">
              {fixes.map((fix, i) => (
                <li key={fix.action} className="py-3">
                  <p className="text-lg font-semibold">
                    {fix.action} <span className="font-normal text-muted-foreground">({fix.examples})</span>
                  </p>
                  <p className="mt-0.5">{fix.amount}.</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {fix.why} {fix.note}
                  </p>
                  {i === 0 && fixes.length > 1 && <p className="mt-2 text-sm text-muted-foreground">If that isn’t enough:</p>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">Add a little, stir, wait a moment, then taste again.</p>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Only taste once any meat, fish or egg in it is cooked through.</p>
    </section>
  );
};

export default TasteCheck;
