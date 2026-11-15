import { TASTES, type TasteVector } from '@/lib/flavor/tastes';

/** The tastes that stand out in a profile, as colored dots with labels. */
const TasteDots = ({ values, max = 3, threshold = 4 }: { values: TasteVector; max?: number; threshold?: number }) => {
  const top = TASTES.map((t, i) => ({ ...t, value: values[i] }))
    .filter((t) => t.value >= threshold)
    .sort((a, b) => b.value - a.value)
    .slice(0, max);
  if (top.length === 0) return <span className="text-sm text-muted-foreground">Mild</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {top.map((t) => (
        <li key={t.key} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
          {t.label}
        </li>
      ))}
    </ul>
  );
};

export default TasteDots;
