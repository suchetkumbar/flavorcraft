import type { Recipe } from './types';

/**
 * TheMealDB public API (https://www.themealdb.com/api.php).
 * "1" is the documented free test key for development and educational use.
 * A production launch should use a paid key; see SETUP_GUIDE.md.
 */
const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const CACHE_KEY = 'flavorcraft:mealdb:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type MealDbMeal = Record<string, string | null> & { idMeal: string; strMeal: string };

const clean = (s: string | null | undefined) => (s ?? '').trim();

const splitSteps = (instructions: string): string[] =>
  instructions
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(step\s*)?\d+[.):-]?\s*/i, '').trim())
    .filter((line) => line.length > 3 && !/^step\s*\d*$/i.test(line));

export const normalizeMeal = (meal: MealDbMeal): Recipe => {
  const ingredients = [];
  for (let i = 1; i <= 20; i += 1) {
    const name = clean(meal[`strIngredient${i}`]);
    if (name) ingredients.push({ name, measure: clean(meal[`strMeasure${i}`]) });
  }
  return {
    id: `mdb-${meal.idMeal}`,
    title: clean(meal.strMeal),
    category: clean(meal.strCategory) || 'Other',
    area: clean(meal.strArea) || 'Unknown',
    image: clean(meal.strMealThumb) || undefined,
    tags: clean(meal.strTags)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    ingredients,
    steps: splitSteps(clean(meal.strInstructions)),
    videoUrl: clean(meal.strYoutube) || undefined,
    sourceUrl: clean(meal.strSource) || undefined,
    source: 'themealdb',
  };
};

/** The stored catalog. `allowStale` returns it even past its day, for when the network is gone. */
const readCache = (allowStale = false): Recipe[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { savedAt, recipes } = JSON.parse(raw) as { savedAt: number; recipes: Recipe[] };
    if (!Array.isArray(recipes) || (!allowStale && Date.now() - savedAt > CACHE_TTL_MS)) return null;
    return recipes;
  } catch {
    return null;
  }
};

const writeCache = (recipes: Recipe[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), recipes }));
  } catch {
    // Storage full or unavailable; the app still works without the cache.
  }
};

/**
 * Loads TheMealDB's full catalog (a few hundred meals) by searching each
 * first letter. Results are cached in localStorage for a day.
 * Throws only if every request fails.
 */
export const fetchMealDbCatalog = async (): Promise<Recipe[]> => {
  const cached = readCache();
  if (cached) return cached;

  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const results = await Promise.allSettled(
    letters.map(async (letter) => {
      const res = await fetch(`${BASE_URL}/search.php?f=${letter}`);
      if (!res.ok) throw new Error(`TheMealDB returned ${res.status}`);
      const data = (await res.json()) as { meals: MealDbMeal[] | null };
      return data.meals ?? [];
    }),
  );

  const fulfilled = results.filter((r): r is PromiseFulfilledResult<MealDbMeal[]> => r.status === 'fulfilled');
  if (fulfilled.length === 0) {
    // Offline or TheMealDB is down: yesterday's catalog is far better than none.
    const stale = readCache(true);
    if (stale) return stale;
    throw new Error('Could not reach TheMealDB');
  }

  const recipes = fulfilled.flatMap((r) => r.value).map(normalizeMeal);
  // Only cache a complete catalog, so a partial outage doesn't stick for a day.
  if (fulfilled.length === letters.length) writeCache(recipes);
  return recipes;
};
