import { TASTES } from '@/lib/flavor/tastes';

/** Eight-segment mark: one wedge per taste. Same shape as public/favicon.svg. */
export const Logo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden>
    {TASTES.map((t, i) => {
      const a0 = (Math.PI * 2 * i) / 8 - Math.PI / 2 - Math.PI / 8;
      const a1 = a0 + Math.PI / 4;
      const r = i % 2 === 0 ? 10 : 7;
      return (
        <path
          key={t.key}
          d={`M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`}
          fill={t.color}
        />
      );
    })}
  </svg>
);
