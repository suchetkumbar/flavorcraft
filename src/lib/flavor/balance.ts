import type { DishProblem } from './fixes';
import { TASTE_KEYS, type TasteKey, type TasteVector } from './tastes';
import type { FlavorProfile } from './profile';

export interface BalanceWarning {
  id: string;
  /** Short label for cards, e.g. "Rich with no acid". */
  label: string;
  /** What to do about it, in plain words. */
  suggestion: string;
  /** The "Fix my dish" problem that covers this, so the UI can jump to it. */
  problem: DishProblem;
}

const v = (p: TasteVector, k: TasteKey) => p[TASTE_KEYS.indexOf(k)];

/**
 * Rules for a dish that leans hard one way with nothing to balance it.
 * Ordered by how noticeable the imbalance is when eating.
 */
const RULES: { id: string; test: (p: TasteVector) => boolean; label: string; suggestion: string; problem: DishProblem }[] = [
  {
    id: 'rich-no-acid',
    // Not for desserts: sweet and rich is the point of a rice pudding.
    test: (p) => v(p, 'rich') >= 7 && v(p, 'sour') < 2.5 && v(p, 'bitter') < 2.5 && v(p, 'sweet') < 5,
    label: 'Rich with no acid',
    suggestion: 'Serve it with something sharp, like pickles, a lemony salad or a squeeze of lemon, to lift it.',
    problem: 'too-heavy',
  },
  {
    id: 'hot-no-cooling',
    test: (p) => v(p, 'heat') >= 7 && v(p, 'rich') < 3 && v(p, 'sweet') < 3,
    label: 'Hot with nothing to cool it',
    suggestion: 'Serve with yogurt, coconut or something sweet to take the edge off.',
    problem: 'too-spicy',
  },
  {
    id: 'savory-too-sweet',
    // Savory dishes only (desserts are meant to be sweet): clear umami, lots of sugar, no acid.
    test: (p) => v(p, 'sweet') >= 7 && v(p, 'umami') >= 4 && v(p, 'sour') < 2.5,
    label: 'Sweet for a savory dish',
    suggestion: 'A splash of vinegar or citrus, or a pinch of salt, will pull it back toward savory.',
    problem: 'too-sweet',
  },
  {
    id: 'salty-unbalanced',
    test: (p) => v(p, 'salty') >= 7.5 && v(p, 'sour') < 2 && v(p, 'sweet') < 2.5 && v(p, 'rich') < 4,
    label: 'Salty with little to balance it',
    suggestion: 'Taste before adding more salt; acid or a little sweetness rounds it out.',
    problem: 'too-salty',
  },
  {
    id: 'savory-no-lift',
    test: (p) => v(p, 'umami') >= 6.5 && v(p, 'aroma') < 3 && v(p, 'sour') < 3,
    label: 'Savory but flat',
    suggestion: 'Fresh herbs or citrus zest just before serving will brighten it.',
    problem: 'flat',
  },
];

/** Below this share of profiled ingredients, warnings would mostly be guesses. */
const MIN_COVERAGE = 0.7;

export const balanceWarnings = (flavor: FlavorProfile, max = 1): BalanceWarning[] => {
  if (flavor.total === 0 || flavor.matched / flavor.total < MIN_COVERAGE) return [];
  return RULES.filter((r) => r.test(flavor.vector))
    .slice(0, max)
    .map(({ id, label, suggestion, problem }) => ({ id, label, suggestion, problem }));
};
