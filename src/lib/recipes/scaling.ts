import { matchIngredient } from '../flavor/ingredients';

/**
 * Salt, spice, chilli, acid and salty sauces don't scale linearly: doubling a
 * pot rarely needs double the salt. These are scaled by factor^0.75 when
 * making more (a common kitchen rule of thumb), then you taste and adjust.
 */
const SEASONING_KEYS = new Set([
  'salt', 'salt and pepper', 'pepper', 'black pepper', 'cayenne', 'chilli', 'chili', 'chilli powder', 'chili powder',
  'red pepper flakes', 'hot sauce', 'tabasco', 'sriracha', 'harissa', 'gochujang', 'scotch bonnet', 'jalapeno',
  'paprika', 'smoked paprika', 'cumin', 'cinnamon', 'nutmeg', 'clove', 'cardamom', 'star anise', 'garam masala',
  'curry powder', 'curry paste', 'five spice', 'allspice', 'saffron', 'turmeric', 'fenugreek', 'caraway', 'cardomom',
  'soy sauce', 'fish sauce', 'worcestershire', 'oyster sauce', 'miso', 'stock cube', 'mustard', 'garlic powder',
  'vinegar', 'rice vinegar', 'red wine vinegar', 'balsamic vinegar', 'lemon juice', 'hotsauce',
]);

export const isSeasoning = (name: string): boolean => {
  const key = matchIngredient(name)?.key;
  return key ? SEASONING_KEYS.has(key) : false;
};

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 };
const NUMBER = String.raw`(\d+\s+\d+\/\d+|\d+\/\d+|\d*[½⅓⅔¼¾⅛]|\d+(?:\.\d+)?)`;
const LEADING = new RegExp(String.raw`^\s*${NUMBER}(?:\s*(?:-|–|to)\s*${NUMBER})?(.*)$`);
// "juice of 1", "zest and juice of 2 limes": the number comes after a lead-in.
const LEAD_IN = new RegExp(String.raw`^(\s*(?:the\s+)?(?:juice|zest|zest and juice|juice and zest)\s+of\s+)${NUMBER}(.*)$`, 'i');

const parseNumber = (token: string): number => {
  const t = token.trim();
  const uni = t.match(/^(\d*)([½⅓⅔¼¾⅛])$/);
  if (uni) return (uni[1] ? Number(uni[1]) : 0) + UNICODE_FRACTIONS[uni[2]];
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(t);
};

/** Splits "1 1/2 cups" into 1.5 and " cups"; ranges like "2-3" keep both ends. Null if there's no leading number. */
export const parseQuantity = (measure: string): { low: number; high?: number; rest: string; prefix?: string } | null => {
  const lead = measure.match(LEAD_IN);
  if (lead) {
    const low = parseNumber(lead[2]);
    return Number.isFinite(low) && low > 0 ? { low, rest: lead[3], prefix: lead[1] } : null;
  }
  const m = measure.match(LEADING);
  if (!m) return null;
  const low = parseNumber(m[1]);
  const high = m[2] ? parseNumber(m[2]) : undefined;
  if (!Number.isFinite(low) || low <= 0) return null;
  return { low, high, rest: m[3] };
};

/** Measures with no unit ("2", "1 stick", "juice of 1") count whole things, so they round to halves. */
const UNIT = /^\s*(tsp|tbsp|tbs|tablespoons?|teaspoons?|cups?|g|kg|grams?|ml|l|litres?|liters?|oz|lb|lbs|pounds?|ounces?|pints?|quarts?)\b/i;
const roundCount = (n: number) => (n >= 3 ? Math.round(n) : Math.max(0.5, Math.round(n * 2) / 2));

const NICE_FRACTIONS: [number, string][] = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'],
];

/** Formats a quantity for a recipe: friendly fractions for small amounts, round numbers for big ones. */
export const formatQuantity = (n: number, unit = ''): string => {
  const metric = /^\s*(g|ml|grams?|millilit)/i.test(unit);
  if (metric && n >= 20) return String(Math.round(n / 5) * 5);
  if (n >= 10) return String(Math.round(n));
  const whole = Math.floor(n);
  const part = n - whole;
  if (part < 0.06) return String(whole || NICE_FRACTIONS[0][1]);
  if (part > 0.94) return String(whole + 1);
  const [, glyph] = NICE_FRACTIONS.reduce((best, f) => (Math.abs(f[0] - part) < Math.abs(best[0] - part) ? f : best));
  return `${whole || ''}${glyph}`;
};

export interface ScaledMeasure {
  text: string;
  /** False when the measure had no number to scale ("to taste", "a handful"). */
  scaled: boolean;
  /** True when it was scaled less than the rest because it's a seasoning. */
  eased: boolean;
}

/** Scales a measure like "2 tbsp" by `factor`, easing seasonings when making more. */
export const scaleMeasure = (name: string, measure: string, factor: number): ScaledMeasure => {
  if (factor === 1) return { text: measure, scaled: false, eased: false };
  const q = parseQuantity(measure);
  if (!q) return { text: measure, scaled: false, eased: false };
  const eased = factor > 1 && isSeasoning(name);
  const f = eased ? factor ** 0.75 : factor;
  const isCount = q.prefix !== undefined || !UNIT.test(q.rest);
  const fmt = (n: number) => formatQuantity(isCount ? roundCount(n) : n, q.rest);
  const low = fmt(q.low * f);
  const high = q.high !== undefined ? `–${fmt(q.high * f)}` : '';
  return { text: `${q.prefix ?? ''}${low}${high}${q.rest}`, scaled: true, eased };
};

export const SCALE_OPTIONS = [0.5, 1, 2, 3] as const;

export const scaleLabel = (factor: number) => (factor === 0.5 ? '½×' : `${factor}×`);
