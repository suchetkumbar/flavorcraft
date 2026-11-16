import { changeWords, tasteChanges } from '../community/tree';
import { isSeasoning } from '../recipes/scaling';
import type { ProfiledRecipe } from '../recipes/types';
import { matchIngredient, normalizeIngredient } from './ingredients';
import { BORING, canonicalName } from './pairings';
import { computeProfile, type IngredientLine } from './profile';
import { distance, emptyVector, type TasteVector } from './tastes';

export interface TasteTarget {
  label: string;
  /** 'cuisine' and 'dish' come from the catalog; 'described' from the assistant's ingredient list. */
  kind: 'cuisine' | 'dish' | 'described';
  vector: TasteVector;
  /** Ingredients that make the target taste the way it does, most characteristic first. */
  signature: string[];
  /** Catalog recipes behind a cuisine target. */
  basedOn?: number;
}

/** Country and place names people type, mapped to TheMealDB's cuisine names. */
const PLACE: Record<string, string> = {
  italy: 'italian', thailand: 'thai', mexico: 'mexican', india: 'indian', japan: 'japanese', china: 'chinese',
  france: 'french', greece: 'greek', spain: 'spanish', morocco: 'moroccan', vietnam: 'vietnamese', turkey: 'turkish',
  britain: 'british', england: 'british', america: 'american', usa: 'american', jamaica: 'jamaican', malaysia: 'malaysian',
  portugal: 'portuguese', poland: 'polish', russia: 'russian', egypt: 'egyptian', tunisia: 'tunisian', kenya: 'kenyan',
  ireland: 'irish', canada: 'canadian', croatia: 'croatian', netherlands: 'dutch', philippines: 'filipino', korea: 'korean',
};

const MIN_CUISINE_RECIPES = 6;
const SIGNATURE_SIZE = 10;
const savory = (r: ProfiledRecipe) => !/dessert/i.test(r.category) && r.flavor.matched >= 3;

const average = (recipes: ProfiledRecipe[]): TasteVector => {
  const sum = emptyVector();
  recipes.forEach((r) => r.flavor.vector.forEach((x, i) => (sum[i] += x)));
  return sum.map((x) => Math.round((x / recipes.length) * 10) / 10) as TasteVector;
};

const usable = (name: string) => !BORING.has(name) && matchIngredient(name) !== null;
const keysOf = (r: ProfiledRecipe) => new Set(r.ingredients.map((i) => canonicalName(i.name)).filter(usable));

/**
 * A cuisine as a target: the average taste of its savory dishes, and the
 * ingredients it uses far more than cooking in general does.
 */
export const cuisineTarget = (area: string, recipes: ProfiledRecipe[]): TasteTarget | null => {
  const all = recipes.filter(savory);
  const mine = all.filter((r) => r.area.toLowerCase() === area.toLowerCase());
  if (mine.length < MIN_CUISINE_RECIPES) return null;

  const count = (list: ProfiledRecipe[]) => {
    const n = new Map<string, number>();
    for (const r of list) for (const k of keysOf(r)) n.set(k, (n.get(k) ?? 0) + 1);
    return n;
  };
  const here = count(mine);
  const everywhere = count(all);
  const signature = [...here]
    .map(([name, n]) => {
      const share = n / mine.length;
      const lift = share / ((everywhere.get(name) ?? n) / all.length);
      return { name, share, score: share * Math.log2(Math.max(lift, 1)) };
    })
    // Used in at least one dish in seven, and clearly more than elsewhere.
    .filter((x) => x.share >= 0.14 && x.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, SIGNATURE_SIZE)
    .map((x) => x.name);

  return { label: `${mine[0].area} cooking`, kind: 'cuisine', vector: average(mine), signature, basedOn: mine.length };
};

/** The ingredients that give a dish its taste, strongest first. */
const dishSignature = (r: ProfiledRecipe): string[] =>
  [...keysOf(r)]
    .map((name) => ({ name, weight: matchIngredient(name)!.vector.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, SIGNATURE_SIZE)
    .map((x) => x.name);

export const dishTarget = (r: ProfiledRecipe): TasteTarget => ({ label: r.title, kind: 'dish', vector: r.flavor.vector, signature: dishSignature(r) });

/** A target built from an ingredient list, e.g. one the assistant gave for a dish that isn't in the catalog. */
export const describedTarget = (label: string, ingredients: string[]): TasteTarget | null => {
  const lines = ingredients.map((name) => ({ name, measure: '' }));
  const profile = computeProfile(lines);
  if (profile.matched < 3) return null;
  return { label, kind: 'described', vector: profile.vector, signature: [...new Set(ingredients.map(canonicalName).filter(usable))].slice(0, SIGNATURE_SIZE) };
};

/**
 * Finds what the cook means by "make it taste like …" in the catalog: a
 * cuisine ("Thai", "more like Mexico") or a dish by name. Null when the
 * catalog can't answer, which is when the assistant is worth asking.
 */
export const findTarget = (query: string, recipes: ProfiledRecipe[], excludeId?: string): TasteTarget | null => {
  const q = normalizeIngredient(query);
  if (q.length < 3) return null;
  const words = q.split(' ');

  const stripped = words.filter((w) => !['a', 'an', 'the', 'like', 'more', 'my', 'style', 'taste', 'tastes'].includes(w)).join(' ');
  const dishes = recipes.filter((r) => r.id !== excludeId && r.flavor.matched >= 3);

  // A dish named exactly wins over a cuisine: "pad thai" means the dish, not Thai cooking.
  const exact = dishes.find((r) => normalizeIngredient(r.title) === stripped);
  if (exact) return dishTarget(exact);

  const areas = [...new Set(recipes.map((r) => r.area.toLowerCase()).filter((a) => a && a !== 'unknown'))];
  const area = areas.find((a) => words.includes(a)) ?? words.map((w) => PLACE[w]).find((a) => a && areas.includes(a));
  if (area) {
    const target = cuisineTarget(area, recipes);
    if (target) return target;
  }

  if (stripped.length < 4) return null;
  const hits = dishes
    .filter((r) => ` ${normalizeIngredient(r.title)} `.includes(` ${stripped} `))
    // The plainest title is most likely the dish itself ("Chicken Curry", not "Thai Green Chicken Curry Bowl").
    .sort((a, b) => a.title.length - b.title.length || a.id.localeCompare(b.id));
  return hits[0] ? dishTarget(hits[0]) : null;
};

/** 0–100: how close a dish tastes to a target. Steep enough that a good plan visibly moves it. */
export const closeness = (a: TasteVector, b: TasteVector): number => Math.round(100 * Math.exp(-((distance(a, b) / 6) ** 2)));

export interface PlanStep {
  kind: 'add' | 'remove';
  name: string;
  /** What the step does to the taste, e.g. "More sour, hotter". */
  effect: string;
}

export interface TastePlan {
  steps: PlanStep[];
  /** Closeness to the target before and after, 0–100. */
  before: number;
  after: number;
  result: IngredientLine[];
  vector: TasteVector;
}

/** Things that flavor a dish rather than being the dish: safe to suggest leaving out. */
const FLAVORING = /\b(cream|butter|cheese|parmesan|sugar|honey|syrup|ketchup|mayonnaise|yogurt|yoghurt|basil|oregano|thyme|rosemary|parsley|coriander|cilantro|dill|mint|sage|bay)\b/;
export const removable = (name: string) =>
  !BORING.has(canonicalName(name)) && (isSeasoning(name) || FLAVORING.test(normalizeIngredient(name)));

/**
 * Worth suggesting as an addition: something that seasons a dish. A cuisine's
 * signature also holds its staples (noodles, prawns, pork), and "add prawns"
 * is a different dinner, not a nudge in taste. Only the last word counts, so
 * "fish sauce" and "rice vinegar" are still seasonings.
 */
const BULK = /(?:^| )(chicken|pork|beef|lamb|duck|turkey|bacon|sausage|prawn|shrimp|fish|salmon|tuna|cod|squid|egg|tofu|rice|noodle|pasta|spaghetti|potato|bread|pastry|flour|starch|cornstarch|cornflour|couscous|bean|lentil|chickpea|cabbage|carrot|leek|corn|tortilla)(?:s|es)?$/;
export const addable = (name: string) => {
  const match = matchIngredient(name);
  return Boolean(match) && !BULK.test(normalizeIngredient(name)) && (isSeasoning(name) || Math.max(...match!.vector) >= 5);
};

const MAX_STEPS = 4;
const MAX_REMOVALS = 2;
/** A step has to close at least this much of the distance to be worth suggesting. */
const MIN_GAIN = 0.3;
const REMOVAL_WEIGHT = 0.6;

/**
 * A short plan that moves a recipe toward a target taste. Each step is the
 * single change that helps most: add one of the target's signature
 * ingredients, or leave out one of the recipe's own flavorings. Main
 * ingredients are never removed, so the dish stays the dish.
 */
export const planToward = (ingredients: IngredientLine[], target: TasteTarget): TastePlan => {
  let lines = [...ingredients];
  let vector = computeProfile(lines).vector;
  const start = vector;
  const steps: PlanStep[] = [];
  const signature = new Set(target.signature);
  let removals = 0;

  while (steps.length < MAX_STEPS) {
    const present = new Set(lines.map((l) => canonicalName(l.name)));
    const moves: { step: Omit<PlanStep, 'effect'>; lines: IngredientLine[] }[] = [];
    for (const name of target.signature) {
      if (!present.has(name) && addable(name)) moves.push({ step: { kind: 'add', name }, lines: [...lines, { name, measure: '' }] });
    }
    if (removals < MAX_REMOVALS && lines.length > 3) {
      lines.forEach((line, i) => {
        // Only the recipe's own ingredients, and nothing the target is known for.
        const original = ingredients.includes(line);
        if (original && removable(line.name) && !signature.has(canonicalName(line.name))) {
          moves.push({ step: { kind: 'remove', name: line.name }, lines: lines.filter((_, j) => j !== i) });
        }
      });
    }

    const here = distance(vector, target.vector);
    const ranked = moves
      .map((m) => ({ ...m, vector: computeProfile(m.lines).vector }))
      // Leaving things out counts for less: a plan should mostly be about what to reach for.
      .map((m) => ({ ...m, gain: (here - distance(m.vector, target.vector)) * (m.step.kind === 'remove' ? REMOVAL_WEIGHT : 1) }))
      .sort((a, b) => b.gain - a.gain || a.step.name.localeCompare(b.step.name));
    // Open with something from the target when anything helps at all: "leave out
    // the parmesan" alone doesn't make a dish taste Mexican.
    const opener = steps.length === 0 ? ranked.find((m) => m.step.kind === 'add' && m.gain >= MIN_GAIN / 3) : undefined;
    const best = opener ?? ranked[0];
    if (!best || (best !== opener && best.gain < MIN_GAIN)) break;

    steps.push({ ...best.step, effect: changeWords(tasteChanges(vector, best.vector)) });
    if (best.step.kind === 'remove') removals += 1;
    lines = best.lines;
    vector = best.vector;
  }

  return { steps, before: closeness(start, target.vector), after: closeness(vector, target.vector), result: lines, vector };
};
