import type { FlavorProfile } from './profile';
import { TASTES } from './tastes';

export interface TasteDifference {
  /** Index into TASTES. */
  taste: number;
  /** Positive when A is stronger, negative when B is. */
  delta: number;
  /** Ingredients driving this taste in whichever dish is stronger. */
  because: string[];
}

const COMPARATIVE: Record<string, string> = {
  sweet: 'sweeter',
  salty: 'saltier',
  sour: 'more sour',
  bitter: 'more bitter',
  umami: 'more savory',
  heat: 'hotter',
  rich: 'richer',
  aroma: 'more aromatic',
};

/** The tastes where two dishes differ most, strongest difference first. */
export const compareProfiles = (a: FlavorProfile, b: FlavorProfile, threshold = 1): TasteDifference[] =>
  TASTES.map((_, i) => {
    const delta = Math.round((a.vector[i] - b.vector[i]) * 10) / 10;
    return { taste: i, delta, because: (delta > 0 ? a : b).sources[i].slice(0, 2) };
  })
    .filter((d) => Math.abs(d.delta) >= threshold)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

/** Plain sentences such as "Tamarind Prawns is hotter, from the red chilli." */
export const explainDifferences = (aTitle: string, bTitle: string, diffs: TasteDifference[], max = 3): string[] =>
  diffs.slice(0, max).map((d) => {
    const who = d.delta > 0 ? aTitle : bTitle;
    const word = COMPARATIVE[TASTES[d.taste].key];
    const from = d.because.length ? `, from the ${d.because.map((s) => s.toLowerCase()).join(' and ')}` : '';
    return `${who} is ${word}${from}.`;
  });

/** 0–100: how alike two dishes taste, from the distance between their profiles. */
export const similarity = (a: FlavorProfile, b: FlavorProfile): number => {
  const dist = Math.sqrt(a.vector.reduce((s, x, i) => s + (x - b.vector[i]) ** 2, 0));
  const maxDist = Math.sqrt(8 * 100);
  return Math.round((1 - dist / maxDist) * 100);
};
