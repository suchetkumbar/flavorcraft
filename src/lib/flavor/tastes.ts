export const TASTE_KEYS = [
  'sweet',
  'salty',
  'sour',
  'bitter',
  'umami',
  'heat',
  'rich',
  'aroma',
] as const;

export type TasteKey = (typeof TASTE_KEYS)[number];

/** A taste vector: one 0–10 intensity per dimension, in TASTE_KEYS order. */
export type TasteVector = [number, number, number, number, number, number, number, number];

export interface TasteMeta {
  key: TasteKey;
  label: string;
  color: string;
  /** Plain-language hint shown next to sliders and charts. */
  hint: string;
}

export const TASTES: TasteMeta[] = [
  { key: 'sweet', label: 'Sweet', color: '#D9779F', hint: 'sugar, fruit, honey' },
  { key: 'salty', label: 'Salty', color: '#4F74A8', hint: 'salt, soy, cheese' },
  { key: 'sour', label: 'Sour', color: '#9AA61A', hint: 'citrus, vinegar, yogurt' },
  { key: 'bitter', label: 'Bitter', color: '#4E6B47', hint: 'greens, cocoa, coffee' },
  { key: 'umami', label: 'Umami', color: '#8A5534', hint: 'mushroom, tomato, broth' },
  { key: 'heat', label: 'Heat', color: '#D93A22', hint: 'chilli, pepper, ginger' },
  { key: 'rich', label: 'Richness', color: '#C99A1E', hint: 'butter, cream, oil' },
  { key: 'aroma', label: 'Aroma', color: '#7B5CB8', hint: 'herbs, spices, zest' },
];

export const TASTE_BY_KEY: Record<TasteKey, TasteMeta> = Object.fromEntries(
  TASTES.map((t) => [t.key, t]),
) as Record<TasteKey, TasteMeta>;

export const emptyVector = (): TasteVector => [0, 0, 0, 0, 0, 0, 0, 0];

export const clampVector = (v: number[]): TasteVector =>
  v.map((x) => Math.max(0, Math.min(10, x))) as TasteVector;

/** Index of the strongest dimension, or -1 for an all-zero vector. */
export const dominantIndex = (v: TasteVector): number => {
  let best = -1;
  let bestVal = 0;
  v.forEach((x, i) => {
    if (x > bestVal) {
      best = i;
      bestVal = x;
    }
  });
  return best;
};

export const distance = (a: TasteVector, b: TasteVector): number =>
  Math.sqrt(a.reduce((sum, x, i) => sum + (x - b[i]) ** 2, 0));

/** One-line plain-language summary, e.g. "Mostly sour, heat and aroma". */
export const describeProfile = (v: TasteVector): string => {
  const ranked = TASTES.map((t, i) => ({ label: t.label.toLowerCase(), value: v[i] }))
    .filter((t) => t.value >= 4)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((t) => t.label);
  if (ranked.length === 0) return 'Mild, with no strong taste';
  if (ranked.length === 1) return `Mostly ${ranked[0]}`;
  return `Mostly ${ranked.slice(0, -1).join(', ')} and ${ranked[ranked.length - 1]}`;
};
