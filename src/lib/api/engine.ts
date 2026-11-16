/**
 * The part of the flavor engine that the public API serves. Together with
 * router.ts it is bundled into `supabase/functions/flavor-api/engine.js` by
 * `npm run build:engine`, so the API and the app always compute the same
 * numbers. Keep it free of browser APIs.
 */
import { changeWords, tasteChanges } from '../community/tree';
import { balanceWarnings } from '../flavor/balance';
import { drinkPairings } from '../flavor/drinks';
import { computeProfile, type IngredientLine } from '../flavor/profile';
import { TASTES, describeProfile, type TasteVector } from '../flavor/tastes';
import { KNOWN_INGREDIENTS, matchIngredient } from '../flavor/ingredients';
import { DRINKS } from '../flavor/drinks';
import { ORIGINAL_RECIPES as ORIGINALS } from '../recipes/originals';
import { substitutesFor } from '../pantry/match';
import { chartSvg, shareCardSvg } from './svg';

export { chartSvg, shareCardSvg };

export const MAX_INGREDIENTS = 60;

/**
 * Reads an ingredient list from the API's inputs: a comma-separated string
 * ("lime, fish sauce: 1 tbsp") or an array of names or {name, measure}.
 * Returns null when there is nothing usable or far too much.
 */
export const parseIngredients = (input: unknown): IngredientLine[] | null => {
  const raw: unknown[] = typeof input === 'string' ? input.split(/[,\n;]/) : Array.isArray(input) ? input : [];
  if (raw.length > MAX_INGREDIENTS * 2) return null;
  const lines: IngredientLine[] = [];
  for (const item of raw) {
    let name = '';
    let measure = '';
    if (typeof item === 'string') {
      const colon = item.indexOf(':');
      name = colon === -1 ? item : item.slice(0, colon);
      measure = colon === -1 ? '' : item.slice(colon + 1);
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      name = typeof o.name === 'string' ? o.name : '';
      measure = typeof o.measure === 'string' ? o.measure : '';
    }
    name = name.trim().slice(0, 80);
    if (name) lines.push({ name, measure: measure.trim().slice(0, 60) });
  }
  return lines.length > 0 && lines.length <= MAX_INGREDIENTS ? lines : null;
};

/** The JSON the API returns for a list of ingredients. */
export const profileResponse = (lines: IngredientLine[]) => {
  const profile = computeProfile(lines);
  return {
    summary: describeProfile(profile.vector),
    tastes: TASTES.map((t, i) => ({ key: t.key, label: t.label, value: profile.vector[i], color: t.color, from: profile.sources[i] })),
    vector: profile.vector,
    matched: profile.matched,
    total: profile.total,
    unrecognized: lines.filter((l) => !matchIngredient(l.name)).map((l) => l.name),
    warnings: balanceWarnings(profile).map((w) => ({ label: w.label, suggestion: w.suggestion })),
    note: 'Scores run from 0 to 10 and are culinary estimates from a hand-tuned ingredient table, not measurements.',
  };
};

export const vectorOf = (lines: IngredientLine[]): TasteVector => computeProfile(lines).vector;

export const swapsResponse = (ingredient: string) => {
  const match = matchIngredient(ingredient);
  const subs = substitutesFor(ingredient);
  return {
    ingredient,
    recognized: Boolean(match),
    swaps: subs ? subs.keys : [],
    why: subs ? subs.why : null,
  };
};

export const drinksResponse = (lines: IngredientLine[], alcohol: boolean) => ({
  summary: describeProfile(vectorOf(lines)),
  drinks: drinkPairings(vectorOf(lines), { alcohol }).map((p) => ({
    name: p.drink.name,
    style: p.drink.style,
    alcohol: p.drink.alcohol,
    how: p.how,
    reason: p.reason,
  })),
});

/** The share image for a remix, given the remix and what it was made from. */
export const remixCard = (remix: { title: string; ingredients: IngredientLine[] }, original: { title: string; ingredients: IngredientLine[] } | null) => {
  const vector = vectorOf(remix.ingredients);
  const compare = original ? vectorOf(original.ingredients) : undefined;
  return shareCardSvg({
    title: remix.title,
    subtitle: original ? `A remix of ${original.title}` : 'A FlavorCraft remix',
    change: compare ? changeWords(tasteChanges(compare, vector)) : undefined,
    vector,
    compare,
  });
};

/**
 * A fingerprint of the engine's data and arithmetic. The deployed API reports
 * it at GET /, and a test compares it with the app's own, so a stale or
 * damaged copy of engine.js is caught.
 */
export const engineFingerprint = (): string => {
  const sample = [
    KNOWN_INGREDIENTS.map((k) => [k, matchIngredient(k)?.vector]),
    DRINKS.map((d) => [d.name, d.vector, d.body]),
    ORIGINALS.map((r) => [r.id, computeProfile(r.ingredients).vector]),
    computeProfile(parseIngredients('Crème fraîche, Jalapeño: 2, soy sauce: 1 tsp, lime, sugar: pinch') ?? []).vector,
  ];
  let h = 2166136261;
  for (const ch of JSON.stringify(sample)) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
};
