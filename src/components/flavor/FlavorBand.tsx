import { TASTES, type TasteVector } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';

interface FlavorBandProps {
  values: TasteVector;
  className?: string;
}

/**
 * A compact strip that splits its width across the eight tastes in proportion
 * to their intensity. Used on cards where a full radar would be too busy.
 */
const FlavorBand = ({ values, className }: FlavorBandProps) => {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={cn('flex h-1.5 w-full overflow-hidden rounded-full bg-border', className)} aria-hidden>
      {TASTES.map((t, i) =>
        values[i] > 0.5 ? (
          <span key={t.key} style={{ width: `${(values[i] / total) * 100}%`, background: t.color }} />
        ) : null,
      )}
    </div>
  );
};

export default FlavorBand;
