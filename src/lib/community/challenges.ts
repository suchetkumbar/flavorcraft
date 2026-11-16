import { normalizeIngredient } from '../flavor/ingredients';
import { computeProfile, type IngredientLine } from '../flavor/profile';
import { TASTES, TASTE_KEYS, type TasteKey } from '../flavor/tastes';
import type { ProfiledRecipe } from '../recipes/types';

interface TasteGoal {
  taste: TasteKey;
  /** Positive: raise by at least this much. Negative: lower by at least this much. */
  by: number;
}

export interface ChallengeBrief {
  id: string;
  title: string;
  /** One sentence saying what to do. */
  brief: string;
  hint: string;
  goals: TasteGoal[];
  /** Tastes that must not drop by more than `within`. */
  keep?: { taste: TasteKey; within: number }[];
  /** Ingredients the remix must not contain (matched at word starts). */
  banned?: string[];
  bannedLabel?: string;
  /** Limit on ingredients that aren't in the original. */
  maxAdded?: number;
  /** Which recipes make a fair starting point. */
  suits: (r: ProfiledRecipe) => boolean;
}

const v = (r: ProfiledRecipe, taste: TasteKey) => r.flavor.vector[TASTE_KEYS.indexOf(taste)];
/** Main dishes make the fairest starting points. */
const savory = (r: ProfiledRecipe) => !/dessert|breakfast|side|starter/i.test(r.category);
const contains = (ingredients: IngredientLine[], words: string[]) =>
  ingredients.map((i) => ` ${normalizeIngredient(i.name)}`).filter((name) => words.some((w) => name.includes(` ${w}`)));

const CITRUS = ['lemon', 'lime', 'orange', 'grapefruit', 'citrus', 'yuzu'];
const CHILLI = ['chilli', 'chili', 'chile', 'cayenne', 'jalapeno', 'sriracha', 'hot sauce', 'tabasco', 'harissa', 'habanero', 'scotch bonnet', 'gochujang'];
const SHORTCUTS = ['soy', 'stock', 'broth', 'bouillon', 'fish sauce', 'worcestershire', 'oyster sauce', 'marmite'];

/** The weekly prompts, used in rotation. Each was checked to be achievable on the real catalog. */
export const BRIEFS: ChallengeBrief[] = [
  {
    id: 'bright-no-citrus',
    title: 'Brighter, without citrus',
    brief: 'Make this dish taste sharper and fresher, without lemon, lime or orange.',
    hint: 'Vinegars, yogurt, tamarind, pickles and tomatoes all bring acid.',
    goals: [{ taste: 'sour', by: 1.5 }],
    banned: CITRUS,
    bannedLabel: 'No citrus',
    suits: (r) => savory(r) && v(r, 'sour') <= 3.5 && v(r, 'rich') >= 4 && contains(r.ingredients, CITRUS).length === 0,
  },
  {
    id: 'heat-no-chilli',
    title: 'Hotter, without chilli',
    brief: 'Give this dish real heat without any kind of chilli or hot sauce.',
    hint: 'Ginger, mustard, horseradish, wasabi and black pepper all burn in their own way.',
    goals: [{ taste: 'heat', by: 2 }],
    banned: CHILLI,
    bannedLabel: 'No chilli or hot sauce',
    suits: (r) => savory(r) && v(r, 'heat') <= 2 && v(r, 'umami') >= 2 && contains(r.ingredients, CHILLI).length === 0,
  },
  {
    id: 'depth-no-shortcuts',
    title: 'Deeper, without the shortcuts',
    brief: 'Add savory depth without stock, soy sauce or other bottled umami.',
    hint: 'Mushrooms, tomato paste, parmesan, anchovy and miso are all allowed.',
    goals: [{ taste: 'umami', by: 1.5 }],
    banned: SHORTCUTS,
    bannedLabel: 'No stock, soy or bottled sauces',
    suits: (r) => savory(r) && v(r, 'umami') <= 3.5 && contains(r.ingredients, SHORTCUTS).length === 0,
  },
  {
    id: 'lighter-still-savory',
    title: 'Lighter, still satisfying',
    brief: 'Make this dish noticeably lighter without losing its savory depth.',
    hint: 'Swap or drop the cream, butter and cheese, then put the depth back another way.',
    goals: [{ taste: 'rich', by: -2 }],
    keep: [{ taste: 'umami', within: 0.5 }],
    suits: (r) => savory(r) && v(r, 'rich') >= 6 && v(r, 'umami') >= 3,
  },
  {
    id: 'dessert-with-edge',
    title: 'A dessert with an edge',
    brief: 'Cut the sweetness of this dessert and give it some tang.',
    hint: 'Less sugar, then yogurt, sour fruit, or a little citrus.',
    goals: [
      { taste: 'sweet', by: -1.5 },
      { taste: 'sour', by: 1 },
    ],
    suits: (r) => /dessert/i.test(r.category) && v(r, 'sweet') >= 6 && v(r, 'sour') <= 3,
  },
  {
    id: 'fresher-in-two',
    title: 'Fresher, in two moves',
    brief: 'Make this dish more aromatic by adding no more than two ingredients.',
    hint: 'Fresh herbs, zest, toasted spices. Choose the two that do the most.',
    goals: [{ taste: 'aroma', by: 2 }],
    maxAdded: 2,
    suits: (r) => savory(r) && v(r, 'aroma') <= 3.5,
  },
  {
    id: 'salt-down',
    title: 'Less salt, same depth',
    brief: 'Bring the saltiness down without the dish losing its savory depth.',
    hint: 'Take out a salty ingredient, then rebuild the depth with something that isn’t.',
    goals: [{ taste: 'salty', by: -1.5 }],
    keep: [{ taste: 'umami', within: 0.5 }],
    suits: (r) => savory(r) && v(r, 'salty') >= 5 && v(r, 'umami') >= 4,
  },
];

const DAY = 86_400_000;

/** Monday 00:00 UTC of the week containing `date`. */
const weekStart = (date: Date): Date => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
};

/** ISO week, e.g. "2026-W47". Weeks start on Monday (UTC) for everyone. */
export const weekKey = (date: Date): string => {
  const thursday = new Date(weekStart(date).getTime() + 3 * DAY);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / (7 * DAY)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export interface Challenge {
  key: string;
  brief: ChallengeBrief;
  recipe: ProfiledRecipe;
  /** The moment the next challenge starts. */
  endsAt: Date;
}

/**
 * The challenge for the week containing `date`. Nothing is stored: the prompt
 * rotates by week number and the recipe is picked from the catalog by a hash
 * of the week, so everyone with the same catalog gets the same challenge.
 */
export const challengeFor = (date: Date, recipes: ProfiledRecipe[]): Challenge | null => {
  const start = weekStart(date);
  const key = weekKey(date);
  const weekNumber = Math.round(start.getTime() / (7 * DAY));
  for (let i = 0; i < BRIEFS.length; i++) {
    const brief = BRIEFS[(weekNumber + i) % BRIEFS.length];
    const pool = recipes
      .filter((r) => r.flavor.matched >= 5 && r.steps.length > 0 && brief.suits(r))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (pool.length) return { key, brief, recipe: pool[hash(key) % pool.length], endsAt: new Date(start.getTime() + 7 * DAY) };
  }
  return null;
};

export const previousWeek = (date: Date): Date => new Date(weekStart(date).getTime() - 7 * DAY);

export interface BriefCheck {
  label: string;
  ok: boolean;
  /** What the remix actually did, e.g. "+2.1" or "Uses lime". */
  detail: string;
}

export interface Verdict {
  met: boolean;
  checks: BriefCheck[];
}

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`;

/** Checks a remix against the brief with the flavor engine: no opinions, just the numbers. */
export const judge = (brief: ChallengeBrief, recipe: ProfiledRecipe, ingredients: IngredientLine[]): Verdict => {
  const after = computeProfile(ingredients).vector;
  const delta = (taste: TasteKey) => Math.round((after[TASTE_KEYS.indexOf(taste)] - v(recipe, taste)) * 10) / 10;
  const label = (taste: TasteKey) => TASTES[TASTE_KEYS.indexOf(taste)].label;
  const checks: BriefCheck[] = [];

  for (const g of brief.goals) {
    const d = delta(g.taste);
    checks.push({
      label: `${label(g.taste)} ${g.by > 0 ? 'up' : 'down'} by at least ${Math.abs(g.by)}`,
      ok: g.by > 0 ? d >= g.by : d <= g.by,
      detail: signed(d),
    });
  }
  for (const k of brief.keep ?? []) {
    const d = delta(k.taste);
    checks.push({ label: `${label(k.taste)} not lost`, ok: d >= -k.within, detail: signed(d) });
  }
  if (brief.banned) {
    const used = contains(ingredients, brief.banned);
    checks.push({
      label: brief.bannedLabel ?? 'Nothing off-limits',
      ok: used.length === 0,
      detail: used.length ? `Uses ${used[0].trim()}` : 'None used',
    });
  }
  if (brief.maxAdded !== undefined) {
    const original = new Set(recipe.ingredients.map((i) => normalizeIngredient(i.name)));
    const added = new Set(ingredients.map((i) => normalizeIngredient(i.name)).filter((n) => !original.has(n)));
    checks.push({
      label: `At most ${brief.maxAdded} new ingredients`,
      ok: added.size <= brief.maxAdded,
      detail: `${added.size} added`,
    });
  }
  return { met: checks.every((c) => c.ok), checks };
};

/** "3 days left", "Ends today" */
export const timeLeft = (endsAt: Date, now: Date): string => {
  const days = Math.ceil((endsAt.getTime() - now.getTime()) / DAY);
  if (days <= 1) return 'Ends today';
  return `${days} days left`;
};

export interface RankedEntry<T> {
  entry: T;
  verdict: Verdict;
}

/** Entries that meet the brief come first, then by votes, then oldest first. */
export const rankEntries = <T extends { voteCount: number; createdAt: string }>(entries: RankedEntry<T>[]): RankedEntry<T>[] =>
  [...entries].sort(
    (a, b) =>
      Number(b.verdict.met) - Number(a.verdict.met) ||
      b.entry.voteCount - a.entry.voteCount ||
      a.entry.createdAt.localeCompare(b.entry.createdAt),
  );
