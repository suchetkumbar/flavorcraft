import { distance, type TasteVector } from '../flavor/tastes';
import type { ProfiledRecipe } from '../recipes/types';

export interface HouseholdMember {
  id: string;
  name: string;
  vector: TasteVector;
}

/** 0–100 match between a person's taste and a dish (100 = identical profile). */
export const matchScore = (taste: TasteVector, dish: TasteVector): number =>
  Math.round(Math.max(0, 1 - distance(taste, dish) / Math.sqrt(800)) * 100);

export interface HouseholdPick {
  recipe: ProfiledRecipe;
  /** Each person's match, in member order. */
  scores: number[];
  /** The lowest of the scores: how happy the least happy person will be. */
  floor: number;
}

/**
 * Dishes for everyone at the table. Ranked by the least happy person's match
 * (maximin), not the average: a dish two people love and one dislikes ranks
 * below one everyone likes.
 */
export const householdPicks = (
  people: TasteVector[],
  recipes: ProfiledRecipe[],
  exclude: Set<string> = new Set(),
  limit = 6,
): HouseholdPick[] => {
  if (people.length === 0) return [];
  return recipes
    .filter((r) => !exclude.has(r.id) && r.flavor.matched >= 3)
    .map((recipe) => {
      const scores = people.map((p) => matchScore(p, recipe.flavor.vector));
      return { recipe, scores, floor: Math.min(...scores) };
    })
    .sort((a, b) => b.floor - a.floor || b.scores.reduce((s, x) => s + x, 0) - a.scores.reduce((s, x) => s + x, 0))
    .slice(0, limit);
};

/** Plain words for a match score. */
export const matchWord = (score: number) => (score >= 85 ? 'loves it' : score >= 75 ? 'likes it' : score >= 65 ? 'fine with it' : 'not their thing');
