import type { FlavorProfile, IngredientLine } from '../flavor/profile';

export interface Recipe {
  id: string;
  title: string;
  category: string;
  area: string;
  image?: string;
  tags: string[];
  ingredients: IngredientLine[];
  steps: string[];
  videoUrl?: string;
  sourceUrl?: string;
  source: 'themealdb' | 'flavorcraft';
  /** Short summary; FlavorCraft originals have one, TheMealDB recipes don't. */
  summary?: string;
}

export interface ProfiledRecipe extends Recipe {
  flavor: FlavorProfile;
}
