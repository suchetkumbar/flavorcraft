import { useQuery } from '@tanstack/react-query';
import { computeProfile } from '@/lib/flavor/profile';
import { fetchMealDbCatalog } from '@/lib/recipes/mealdb';
import { ORIGINAL_RECIPES } from '@/lib/recipes/originals';
import type { ProfiledRecipe, Recipe } from '@/lib/recipes/types';

export interface Catalog {
  recipes: ProfiledRecipe[];
  /** False when TheMealDB was unreachable and only originals are shown. */
  online: boolean;
}

const profile = (recipes: Recipe[]): ProfiledRecipe[] =>
  recipes.map((r) => ({ ...r, flavor: computeProfile(r.ingredients) }));

const loadCatalog = async (): Promise<Catalog> => {
  try {
    const remote = await fetchMealDbCatalog();
    return { recipes: profile([...ORIGINAL_RECIPES, ...remote]), online: true };
  } catch {
    return { recipes: profile(ORIGINAL_RECIPES), online: false };
  }
};

export const useCatalog = () =>
  useQuery({
    queryKey: ['catalog'],
    queryFn: loadCatalog,
    staleTime: Infinity,
    gcTime: Infinity,
  });

export const useRecipe = (id: string | undefined) => {
  const query = useCatalog();
  const recipe = query.data?.recipes.find((r) => r.id === id);
  return { ...query, recipe };
};
