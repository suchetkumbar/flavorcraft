import { matchIngredient } from './ingredients';
import { TASTE_KEYS, clampVector, emptyVector, type TasteVector } from './tastes';

export interface IngredientLine {
  name: string;
  measure: string;
}

export interface FlavorProfile {
  vector: TasteVector;
  /** Top contributing ingredient names for each dimension, strongest first. */
  sources: string[][];
  matched: number;
  total: number;
}

/** Small amounts ("a pinch", "to taste") pull less weight than main ingredients. */
const amountFactor = (measure: string): number => {
  const m = measure.toLowerCase();
  if (/pinch|dash|to taste|sprinkl|garnish|few drops/.test(m)) return 0.6;
  if (/\btsp\b|teaspoon/.test(m)) return 0.8;
  return 1;
};

/** Weights for the strongest, second and third contributors; the rest share REST_WEIGHT. */
const RANK_WEIGHTS = [0.55, 0.25, 0.12];
const REST_WEIGHT = 0.05;

/**
 * Turns a list of ingredients into a taste profile.
 *
 * Each dimension is built with diminishing returns: the strongest ingredient
 * counts most, and adding a tenth spice barely moves the needle. This keeps a
 * long ingredient list from saturating every axis.
 */
export const computeProfile = (ingredients: IngredientLine[]): FlavorProfile => {
  const perDim: { name: string; value: number }[][] = TASTE_KEYS.map(() => []);
  let matched = 0;

  for (const line of ingredients) {
    const match = matchIngredient(line.name);
    if (!match) continue;
    matched += 1;
    const factor = amountFactor(line.measure);
    match.vector.forEach((value, i) => {
      if (value > 0) perDim[i].push({ name: line.name, value: value * factor });
    });
  }

  const vector = emptyVector();
  const sources: string[][] = [];

  perDim.forEach((contributions, i) => {
    contributions.sort((a, b) => b.value - a.value);
    vector[i] = contributions.reduce(
      (sum, c, rank) => sum + c.value * (RANK_WEIGHTS[rank] ?? REST_WEIGHT),
      0,
    );
    sources.push(
      contributions
        .filter((c) => c.value >= 3)
        .slice(0, 3)
        .map((c) => c.name),
    );
  });

  return {
    vector: clampVector(vector.map((v) => Math.round(v * 10) / 10)),
    sources,
    matched,
    total: ingredients.length,
  };
};
