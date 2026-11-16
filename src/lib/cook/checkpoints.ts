import type { SeasoningLean } from '../kitchen/seasoningHand';

export type CheckpointReason = 'asked' | 'reduced' | 'final';

export interface Checkpoint {
  /** Index of the step after which to taste. */
  step: number;
  reason: CheckpointReason;
}

// "taste" as an instruction, not the noun ("to enhance taste, use broth").
const ASKED = /\b(to taste|taste (?:and|it|for|the|then|before|as you)|tasting|(?:check|adjust|correct) (?:the |for )?seasoning)\b/i;
const REDUCES = /\b(simmer|reduce|reduced|thicken|thickens|thickened|bubble|stew|braise)/i;
const LONG_COOK = /\b(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(minutes?|mins?|hours?|hrs?)\b/gi;

/** Longest cooking time mentioned in a step, in minutes. */
const longestMinutes = (text: string): number => {
  let best = 0;
  for (const m of text.matchAll(LONG_COOK)) {
    const n = Number(m[2] ?? m[1]) * (/^h/i.test(m[3]) ? 60 : 1);
    if (n > best) best = n;
  }
  return best;
};

export const MAX_CHECKPOINTS = 3;

/**
 * Picks the moments in a recipe where tasting is useful and a fix is still
 * possible: where the recipe says to, after a long simmer (flavors concentrate
 * as liquid reduces), and at the last step before serving.
 *
 * Baked and sweet dishes only get the moments the recipe itself asks for:
 * you can't adjust a cake once it's in the oven.
 */
export const findCheckpoints = (steps: string[], category = ''): Checkpoint[] => {
  if (steps.length === 0) return [];
  const sweet = /dessert/i.test(category);
  const found: Checkpoint[] = [];
  steps.forEach((text, step) => {
    if (ASKED.test(text)) found.push({ step, reason: 'asked' });
    else if (!sweet && REDUCES.test(text) && longestMinutes(text) >= 10) found.push({ step, reason: 'reduced' });
  });
  const last = steps.length - 1;
  if (!sweet && !found.some((c) => c.step >= last - 1)) found.push({ step: last, reason: 'final' });

  if (found.length <= MAX_CHECKPOINTS) return found;
  // Too many: keep what the recipe asked for, then the latest ones (closest to the finished dish).
  const rank = (c: Checkpoint) => (c.reason === 'asked' ? 2 : c.reason === 'final' ? 1 : 0);
  return [...found]
    .sort((a, b) => rank(b) - rank(a) || b.step - a.step)
    .slice(0, MAX_CHECKPOINTS)
    .sort((a, b) => a.step - b.step);
};

const REASON_TEXT: Record<CheckpointReason, string> = {
  asked: 'The recipe says to taste here.',
  reduced: 'Flavors concentrate as liquid cooks down, salt most of all, so check before going further.',
  final: 'Last chance to adjust before it goes to the table.',
};

export const checkpointReason = (c: Checkpoint) => REASON_TEXT[c.reason];

// In taste order: sweet, salty, sour, bitter, umami, heat, rich, aroma.
const WANT_MORE = [
  'sweetness',
  'salt',
  'acid, so see if it needs a squeeze of lemon or a splash of vinegar',
  'bitterness',
  'savory depth',
  'heat',
  'richness',
  'herbs and spice',
];
const TOO_MUCH = ['too sweet', 'too salty', 'too sharp', 'too bitter', 'too intense', 'too hot', 'too heavy', 'too strongly spiced'];

/** A reminder from your seasoning hand, e.g. "You usually want more acid…". */
export const personalHint = (hand: SeasoningLean[]): string | null => {
  const top = [...hand].sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean))[0];
  if (!top) return null;
  return top.lean > 0
    ? `You usually want more ${WANT_MORE[top.taste]}.`
    : `You often find dishes ${TOO_MUCH[top.taste]}, so check that first.`;
};
