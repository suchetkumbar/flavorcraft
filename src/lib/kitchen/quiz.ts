import { TASTES, TASTE_KEYS, clampVector, emptyVector, type TasteVector } from '../flavor/tastes';
import type { ProfiledRecipe } from '../recipes/types';

export interface QuizRound {
  /** The taste this round tests. */
  taste: number;
  /** Strong in the tested taste. */
  high: ProfiledRecipe;
  /** Light in the tested taste, otherwise as similar as possible. */
  low: ProfiledRecipe;
}

export type QuizAnswer = 'high' | 'low' | 'both' | 'neither';

/** Rounds in the order they're asked: the tastes people have the clearest feelings about first. */
const ORDER = ['heat', 'sweet', 'sour', 'rich', 'umami', 'bitter', 'aroma', 'salty'] as const;

/** Pairs must be the same kind of dish, or the round asks "dessert or dinner?" instead of about one taste. */
const course = (r: ProfiledRecipe) => (r.category.toLowerCase() === 'dessert' ? 'dessert' : 'savory');

const usable = (r: ProfiledRecipe) => r.flavor.total >= 4 && r.flavor.matched / r.flavor.total >= 0.8;

/** Distance between two profiles ignoring one taste. */
const distanceExcept = (a: TasteVector, b: TasteVector, skip: number) =>
  Math.sqrt(a.reduce((s, x, i) => (i === skip ? s : s + (x - b[i]) ** 2), 0));

/**
 * Builds quiz rounds from the catalog. Each round pairs a dish strong in one
 * taste with one light in it that's otherwise as alike as possible, so the
 * answer mostly says how you feel about that one taste. Deterministic: the
 * same catalog always gives the same quiz. Prefers dishes with photos.
 */
export const buildQuizRounds = (recipes: ProfiledRecipe[], rounds: number = ORDER.length): QuizRound[] => {
  const pool = recipes.filter(usable);
  const withPhoto = pool.filter((r) => r.image);
  const candidates = withPhoto.length >= 40 ? withPhoto : pool;
  const used = new Set<string>();
  const result: QuizRound[] = [];

  for (const key of ORDER.slice(0, rounds)) {
    const t = TASTE_KEYS.indexOf(key);
    let best: { high: ProfiledRecipe; low: ProfiledRecipe; d: number } | null = null;
    // Search within one kind of dish at a time, so a sweet round is "sticky glazed main vs plain
    // main". Savory first: "which salty dessert?" is an odd question. Desserts only as a fallback.
    for (const kind of ['savory', 'dessert'] as const) {
      if (best) break;
      const ofKind = candidates.filter((r) => !used.has(r.id) && course(r) === kind);
      const highs = ofKind.filter((r) => r.flavor.vector[t] >= 6.5).sort((a, b) => b.flavor.vector[t] - a.flavor.vector[t]).slice(0, 40);
      const lows = ofKind.filter((r) => r.flavor.vector[t] <= 2.5).slice(0, 120);
      for (const high of highs) {
        for (const low of lows) {
          const d = distanceExcept(high.flavor.vector, low.flavor.vector, t);
          if (!best || d < best.d) best = { high, low, d };
        }
      }
    }
    if (!best) continue;
    used.add(best.high.id).add(best.low.id);
    result.push({ taste: t, high: best.high, low: best.low });
  }
  return result;
};

/** Averages the dishes you picked into a profile. Null if you picked nothing. */
export const quizResult = (rounds: QuizRound[], answers: QuizAnswer[]): TasteVector | null => {
  const sum = emptyVector();
  let n = 0;
  rounds.forEach((round, i) => {
    const picked = answers[i] === 'high' ? [round.high] : answers[i] === 'low' ? [round.low] : answers[i] === 'both' ? [round.high, round.low] : [];
    for (const r of picked) {
      r.flavor.vector.forEach((x, j) => (sum[j] += x));
      n += 1;
    }
  });
  return n ? clampVector(sum.map((x) => Math.round((x / n) * 10) / 10)) : null;
};

/** The taste a round tests, in lowercase, e.g. "heat". */
export const roundTasteLabel = (round: QuizRound) => TASTES[round.taste].label.toLowerCase();
