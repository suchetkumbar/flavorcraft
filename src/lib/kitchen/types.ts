import type { DishProblem } from '../flavor/fixes';
import type { IngredientLine } from '../flavor/profile';

export interface SavedRecipe {
  recipeId: string;
  savedAt: string;
}

/**
 * A remix is a changed ingredient list. It forks a recipe, or another remix
 * (parentRemixId), which forms the "forked from" family tree.
 * `removed` and `added` describe the change from the immediate parent.
 */
export interface Remix {
  id: string;
  userId?: string;
  parentRecipeId: string;
  parentRemixId: string | null;
  title: string;
  note: string;
  ingredients: IngredientLine[];
  removed: string[];
  added: string[];
  isPublic: boolean;
  createdAt: string;
}

export interface CookEntry {
  id: string;
  recipeId: string;
  remixId: string | null;
  cookedAt: string;
  rating: number | null;
  problems: DishProblem[];
  note: string;
}

export interface KitchenData {
  saved: SavedRecipe[];
  remixes: Remix[];
  cooks: CookEntry[];
}
