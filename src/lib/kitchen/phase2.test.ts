import { describe, expect, it } from 'vitest';
import { computeProfile } from '../flavor/profile';
import type { TasteVector } from '../flavor/tastes';
import type { ProfiledRecipe } from '../recipes/types';
import { buildQuizRounds, quizResult } from './quiz';
import { householdPicks, matchScore, matchWord } from './household';
import { amountFactorFor, describeLean, seasoningHand } from './seasoningHand';
import { describeDrift, tasteTimeline } from './timeline';
import type { CookEntry, KitchenData, Remix } from './types';

const fake = (id: string, vector: TasteVector, image = true): ProfiledRecipe => ({
  id, title: id, category: 'T', area: 'T', tags: [], steps: [], source: 'flavorcraft', ingredients: [],
  ...(image && { image: `https://x/${id}.jpg` }),
  flavor: { vector, sources: vector.map(() => []), matched: 8, total: 8 },
});

describe('taste quiz', () => {
  // Pairs that differ mainly in heat, plus noise.
  const recipes = [
    fake('hot-curry', [2, 4, 2, 1, 5, 9, 4, 6]),
    fake('mild-curry', [2, 4, 2, 1, 5, 1, 4, 6]),
    fake('hot-tacos', [1, 5, 4, 1, 4, 8, 3, 5]),
    fake('cake', [9, 1, 1, 1, 0, 0, 7, 4]),
    fake('salad', [1, 2, 7, 3, 1, 0, 2, 6]),
  ];

  it('pairs a dish strong in a taste with one that is light in it but otherwise alike', () => {
    const heat = buildQuizRounds(recipes, 1)[0];
    expect(heat.high.id).toBe('hot-curry');
    expect(heat.low.id).toBe('mild-curry');
  });

  it('only pairs dishes of the same kind (dessert with dessert)', () => {
    const mixed = [fake('cake', [9, 1, 1, 1, 0, 0, 7, 4]), fake('stew', [1, 5, 1, 1, 7, 1, 6, 5]), fake('shortbread', [2, 1, 1, 1, 0, 0, 7, 4])];
    mixed[0].category = 'Dessert';
    mixed[2].category = 'Dessert'; // the savory stew is low in sweetness too, but must not be paired with cake
    const sweet = buildQuizRounds(mixed).find((r) => r.taste === 0)!;
    expect([sweet.high.id, sweet.low.id]).toEqual(['cake', 'shortbread']);
  });

  it('never repeats a dish across rounds', () => {
    const ids = buildQuizRounds(recipes).flatMap((r) => [r.high.id, r.low.id]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('averages the picked dishes into a profile', () => {
    const rounds = buildQuizRounds(recipes, 1);
    expect(quizResult(rounds, ['high'])).toEqual(recipes[0].flavor.vector);
    expect(quizResult(rounds, ['both'])?.[5]).toBe(5);
    expect(quizResult(rounds, ['neither'])).toBeNull();
  });
});

describe('household', () => {
  const spicy: TasteVector = [1, 4, 3, 1, 5, 8, 3, 6];
  const mild: TasteVector = [4, 4, 3, 1, 5, 1, 5, 5];
  const recipes = [
    fake('vindaloo', [1, 4, 3, 1, 5, 9, 3, 6]), // one loves, one hates
    fake('middle', [3, 4, 3, 1, 5, 4, 4, 5]), // both fine
    fake('korma', [4, 4, 2, 1, 5, 1, 6, 5]),
  ];

  it('ranks by the least happy person, not the average', () => {
    // A loves heat and no richness; B the opposite. "perfect-for-a" has the higher
    // average (100 for A, 50 for B) but leaves B unhappy; the compromise is lower on
    // average but fine for both, so it must win.
    const a: TasteVector = [0, 0, 0, 0, 0, 10, 0, 0];
    const b: TasteVector = [0, 0, 0, 0, 0, 0, 10, 0];
    const picks = householdPicks([a, b], [fake('perfect-for-a', a), fake('compromise', [0, 0, 0, 0, 0, 5, 6, 0])]);
    const avg = (p: (typeof picks)[number]) => p.scores.reduce((s, x) => s + x, 0) / p.scores.length;
    const [first, second] = picks;
    expect(first.recipe.id).toBe('compromise');
    expect(avg(second)).toBeGreaterThan(avg(first)); // proves the average would have chosen differently
    expect(first.floor).toBe(Math.min(...first.scores));
  });

  it('scores identical tastes 100 and describes matches in words', () => {
    expect(matchScore(spicy, spicy)).toBe(100);
    expect(matchWord(90)).toBe('loves it');
    expect(matchWord(50)).toBe('not their thing');
  });

  it('returns nothing without people', () => {
    expect(householdPicks([], recipes)).toEqual([]);
  });
});

const cook = (problems: CookEntry['problems'], cookedAt = new Date().toISOString(), recipeId = 'a'): CookEntry => ({
  id: crypto.randomUUID(), recipeId, remixId: null, cookedAt, rating: 4, problems, note: '',
});
const remix = (added: string[], removed: string[] = []): Remix => ({
  id: crypto.randomUUID(), parentRecipeId: 'a', parentRemixId: null, title: 'r', note: '', ingredients: [], removed, added, isPublic: false, createdAt: new Date().toISOString(),
});

describe('seasoning hand', () => {
  it('learns from repeated problems and remix edits', () => {
    const hand = seasoningHand({ cooks: [cook(['too-salty']), cook(['too-salty'])], remixes: [remix(['Lime', 'Lemon Juice'])] });
    const salty = hand.find((l) => l.taste === 1)!;
    const sour = hand.find((l) => l.taste === 2)!;
    expect(salty.lean).toBeLessThan(0);
    expect(sour.lean).toBeGreaterThan(0);
    expect(describeLean(salty)).toBe('You usually want less salt than recipes call for');
    expect(describeLean(sour)).toBe('You usually want more acid than recipes call for');
  });

  it('ignores one-off signals and non-seasoning ingredients', () => {
    expect(seasoningHand({ cooks: [cook(['too-salty'])], remixes: [] })).toEqual([]);
    expect(seasoningHand({ cooks: [], remixes: [remix(['Onion', 'Rice'])] })).toEqual([]);
  });

  it('adjusts amounts for clear seasonings only, within ±30%', () => {
    const hand = seasoningHand({ cooks: [cook(['too-salty']), cook(['too-salty']), cook(['too-salty']), cook(['too-salty'])], remixes: [] });
    expect(amountFactorFor('Salt', hand)).toBe(0.7);
    expect(amountFactorFor('Soy Sauce', hand)).toBe(0.7);
    expect(amountFactorFor('Chicken', hand)).toBe(1);
  });
});

describe('taste over time', () => {
  const byId = new Map([
    ['mild', computeProfileRecipe('mild', ['Cream', 'Butter', 'Potato'])],
    ['hot', computeProfileRecipe('hot', ['Chilli', 'Cayenne', 'Lime'])],
  ]);
  function computeProfileRecipe(id: string, names: string[]) {
    const ingredients = names.map((name) => ({ name, measure: '' }));
    return { ...fake(id, [0, 0, 0, 0, 0, 0, 0, 0]), ingredients, flavor: computeProfile(ingredients) };
  }
  const kitchen = (cooks: CookEntry[]): KitchenData => ({ saved: [], remixes: [], cooks });

  it('groups by month and skips thin months', () => {
    const now = new Date(2026, 10, 15);
    const k = kitchen([
      cook([], new Date(2026, 8, 3).toISOString(), 'mild'),
      cook([], new Date(2026, 8, 20).toISOString(), 'mild'),
      cook([], new Date(2026, 9, 2).toISOString(), 'hot'), // only one in October
      cook([], new Date(2026, 10, 1).toISOString(), 'hot'),
      cook([], new Date(2026, 10, 9).toISOString(), 'hot'),
    ]);
    const periods = tasteTimeline(k, byId, 2, now);
    expect(periods.map((p) => p.count)).toEqual([2, 2]);
    expect(describeDrift(periods)).toMatch(/toward more heat/);
    expect(describeDrift(periods)).toMatch(/away from richness/);
  });

  it('says so when taste has barely moved', () => {
    const now = new Date(2026, 10, 15);
    const k = kitchen([
      cook([], new Date(2026, 9, 1).toISOString(), 'mild'),
      cook([], new Date(2026, 9, 2).toISOString(), 'mild'),
      cook([], new Date(2026, 10, 1).toISOString(), 'mild'),
      cook([], new Date(2026, 10, 2).toISOString(), 'mild'),
    ]);
    expect(describeDrift(tasteTimeline(k, byId, 2, now))).toMatch(/stayed steady/);
  });
});

describe('quiz in the taste profile', async () => {
  const { buildTasteProfile } = await import('./tasteProfile');
  const quiz: TasteVector = [1, 2, 8, 1, 2, 7, 2, 6];

  it('gives brand-new users a profile from the quiz alone', () => {
    const p = buildTasteProfile({ saved: [], remixes: [], cooks: [] }, new Map(), quiz)!;
    expect(p.vector).toEqual(quiz);
    expect(p).toMatchObject({ basedOn: 0, fromQuiz: true });
  });

  it('is gradually outweighed by real saves', () => {
    const rich = fake('rich', [3, 3, 0, 0, 4, 0, 9, 3]);
    const byId = new Map([['rich', rich]]);
    const saved = Array.from({ length: 12 }, () => ({ recipeId: 'rich', savedAt: new Date().toISOString() }));
    const p = buildTasteProfile({ saved, remixes: [], cooks: [] }, byId, quiz)!;
    expect(p.vector[6]).toBeGreaterThan(6); // mostly the saved dishes now
    expect(p.vector[2]).toBeGreaterThan(0); // the quiz still counts a little
  });
});
