import { motion, useReducedMotion } from 'framer-motion';
import { TASTES, describeProfile, type TasteVector } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';

interface FlavorRadarProps {
  values: TasteVector;
  /** Optional second profile drawn as a dashed outline, e.g. the original before a remix. */
  compare?: TasteVector;
  compareLabel?: string;
  size?: number;
  showLabels?: boolean;
  className?: string;
}

const R = 100;
const N = TASTES.length;

const point = (i: number, value: number) => {
  const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
  const r = (Math.max(0.4, value) / 10) * R;
  return [Math.cos(angle) * r, Math.sin(angle) * r] as const;
};

const toPoints = (v: TasteVector) =>
  v.map((value, i) => point(i, value).map((n) => n.toFixed(2)).join(',')).join(' ');

const FlavorRadar = ({ values, compare, compareLabel, size = 280, showLabels = true, className }: FlavorRadarProps) => {
  const reduceMotion = useReducedMotion();
  const pad = showLabels ? 62 : 8;
  const view = R + pad;

  return (
    <svg
      viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Flavor profile: ${describeProfile(values)}.${compare && compareLabel ? ` Dashed outline shows ${compareLabel}.` : ''}`}
      className={cn('max-w-full h-auto overflow-visible', className)}
    >
      {/* Rings at 2.5, 5 and 7.5 */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={TASTES.map((_, i) => point(i, f * 10).join(',')).join(' ')}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={f === 1 ? 1.25 : 0.75}
        />
      ))}
      {TASTES.map((t, i) => {
        const [x, y] = point(i, 10);
        return <line key={t.key} x1={0} y1={0} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth={0.75} />;
      })}

      {compare && (
        <polygon
          points={toPoints(compare)}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeOpacity={0.45}
          strokeWidth={1.25}
          strokeDasharray="4 3"
        />
      )}

      <motion.polygon
        initial={false}
        animate={{ points: toPoints(values) }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 22 }}
        fill="hsl(var(--foreground))"
        fillOpacity={0.08}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />

      {TASTES.map((t, i) => {
        const [x, y] = point(i, values[i]);
        return (
          <motion.circle
            key={t.key}
            initial={false}
            animate={{ cx: x, cy: y }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 22 }}
            r={4.5}
            fill={t.color}
            stroke="hsl(var(--background))"
            strokeWidth={1.5}
          />
        );
      })}

      {showLabels &&
        TASTES.map((t, i) => {
          const [x, y] = point(i, 12.4);
          const anchor = Math.abs(x) < 8 ? 'middle' : x > 0 ? 'start' : 'end';
          return (
            <text
              key={t.key}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-foreground"
              style={{ fontSize: 11.5, fontWeight: 500 }}
            >
              {t.label}
            </text>
          );
        })}
    </svg>
  );
};

export default FlavorRadar;
