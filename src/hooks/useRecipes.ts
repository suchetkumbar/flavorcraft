import { useQuery } from '@tanstack/react-query';
import { computeProfile } from '@/lib/flavor/profile';
import { fetchMealDbCatalog } from '@/lib/recipes/mealdb';
import { ORIGINAL_RECIPES } from '@/lib/recipes/originals';
import type { ProfiledRecipe, Recipe } from '@/lib/recipes/types';
import { applyCrowdCorrections, loadCrowdSignals, tuneFromCrowd } from '@/lib/community/crowd';
import { fetchCrowdSignals } from '@/lib/community/remote';
import { accountsEnabled } from '@/lib/supabase';

export interface Catalog {
  recipes: ProfiledRecipe[];
  /** False when TheMealDB was unreachable and only originals are shown. */
  online: boolean;
}

const profile = (recipes: Recipe[]): ProfiledRecipe[] =>
  recipes.map((r) => ({ ...r, flavor: computeProfile(r.ingredients) }));

/**
 * Profiles a catalog after applying what everyone's cooking logs say about
 * ingredient scores. Corrections must be in place before any profile is
 * computed, so the signals are loaded alongside the recipes.
 */
const tuned = (recipes: Recipe[], signals: Awaited<ReturnType<typeof loadCrowdSignals>>): ProfiledRecipe[] => {
  applyCrowdCorrections(tuneFromCrowd(signals, recipes));
  return profile(recipes);
};

const loadCatalog = async (): Promise<Catalog> => {
  const signals = accountsEnabled ? loadCrowdSignals(fetchCrowdSignals) : Promise.resolve([]);
  try {
    const remote = await fetchMealDbCatalog();
    return { recipes: tuned([...ORIGINAL_RECIPES, ...remote], await signals), online: true };
  } catch {
    return { recipes: tuned(ORIGINAL_RECIPES, await signals), online: false };
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
