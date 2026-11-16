import { BORING, canonicalName } from '../flavor/pairings';
import type { TasteVector } from '../flavor/tastes';
import type { ProfiledRecipe } from '../recipes/types';

const SIDE_COURSES = new Set(['side', 'starter']);
const NOT_A_MAIN = new Set(['side', 'starter', 'dessert', 'breakfast']);

export const isMain = (r: Pick<ProfiledRecipe, 'category'>) => !NOT_A_MAIN.has(r.category.toLowerCase());

export interface Companion {
  recipe: ProfiledRecipe;
  why: string;
}

// Positions in a taste vector: [sweet, salty, sour, bitter, umami, heat, rich, aroma].
const SWEET = 0;
const SOUR = 2;
const HEAT = 5;
const RICH = 6;
const AROMA = 7;

/** Cuisines that share a table: a Turkish yogurt dip suits a Tunisian stew. */
const REGIONS: string[][] = [
  ['Turkish', 'Syrian', 'Greek', 'Egyptian', 'Moroccan', 'Tunisian', 'Algerian', 'Saudi Arabian', 'Lebanese'],
  ['Spanish', 'Italian', 'Portuguese', 'Croatian', 'France'],
  ['Chinese', 'Japanese', 'Vietnamese', 'Thai', 'Malaysian', 'Filipino'],
  ['British', 'Irish', 'Netherlands', 'Norway', 'Polish', 'Russian', 'Ukrainian', 'Slovakia', 'Canadian', 'United States', 'Australian'],
  ['Jamaican', 'Mexican', 'Venezuela', 'Argentina', 'Uruguayan'],
  ['India', 'Kenyan'],
];
const REGION_OF = new Map(REGIONS.flatMap((areas, i) => areas.map((a) => [a, i] as const)));

/** 2 for the same cuisine, 1 for a neighboring one, 0 otherwise or when unknown. */
export const cuisineAffinity = (a: string, b: string): number => {
  if (a === 'Unknown' || b === 'Unknown') return 0;
  if (a === b) return 2;
  const ra = REGION_OF.get(a);
  return ra !== undefined && ra === REGION_OF.get(b) ? 1 : 0;
};

/**
 * How well a side balances a main. It should bring what the main lacks
 * (acid next to something rich and unsharp, freshness next to something plain,
 * something cool next to heat), and not repeat what the main is already full of.
 */
export const balanceScore = (main: TasteVector, side: TasteVector): number => {
  const needAcid = Math.max(0, (4 - main[SOUR]) / 4) * (0.5 + main[RICH] / 10);
  const needFresh = Math.max(0, (5 - main[AROMA]) / 5);
  const needCool = Math.max(0, (main[HEAT] - 4) / 6);
  // Cooling means no heat of its own, and ideally dairy-rich or sharp (yogurt, cucumber).
  const cooling = side[HEAT] < 2 ? 0.4 + side[RICH] / 20 + side[SOUR] / 20 : 0;
  return (
    needAcid * side[SOUR] * 1.2 +
    needFresh * side[AROMA] * 0.5 +
    needCool * cooling * 6 -
    (main[RICH] / 10) * side[RICH] * 0.8 -
    (main[HEAT] / 10) * side[HEAT] * 0.8
  );
};

const reason = (main: TasteVector, side: TasteVector): string => {
  if (main[HEAT] >= 5 && side[HEAT] < 2) return side[RICH] >= 4 ? 'Cool and creamy next to the heat' : 'Mild, to cool things down between bites';
  if (main[RICH] >= 5 && side[SOUR] >= 4 && side[RICH] <= main[RICH]) return 'Its sharpness cuts through the richness';
  if (side[SOUR] >= 4 && main[SOUR] < 4) return 'Adds the brightness this dish doesn’t have';
  if (side[AROMA] >= 6 && main[AROMA] < 6) return 'Brings fresh, aromatic contrast';
  if (side[RICH] < 4 && main[RICH] >= 4) return 'Light, so the meal doesn’t get heavy';
  if (side[RICH] >= 5 && main[RICH] < 4) return 'Adds the richness this lean dish is missing';
  return 'A different set of flavors from the main';
};

const names = (r: ProfiledRecipe) =>
  new Set(r.ingredients.map((i) => canonicalName(i.name)).filter((n) => n && !BORING.has(n)));

/** Soups are a course of their own, not something to put next to dinner. */
const SOUP = /\b(soup|bisque|chowder|corba|gazpacho|snert|ajo blanco|broth)\b/i;
/** Bread, rice and dumplings: fine on the table, but "serve with bread" is not a flavor insight. */
const STARCH = /(bread|breads|buns?|flatbreads?|arepas?|dumplings?|rice|challah|lefse|bakes|pancakes)$|^(rye|challah|arepa)/i;
/** Sweet breads and cakes filed under "Side". */
const isSweetBake = (v: TasteVector) => v[SWEET] >= 7 && v[SOUR] < 4;
/** Too little flavor of its own to balance anything. */
const isPlain = (v: TasteVector) => v.reduce((s, x) => s + x, 0) < 14;

export const isSideDish = (r: ProfiledRecipe) =>
  SIDE_COURSES.has(r.category.toLowerCase()) &&
  r.flavor.matched >= 3 &&
  r.steps.length > 0 &&
  !SOUP.test(r.title) &&
  !STARCH.test(r.title.replace(/\s*\(.*\)\s*$/, '')) &&
  !isSweetBake(r.flavor.vector) &&
  !isPlain(r.flavor.vector);

/**
 * Sides and starters that balance a main dish: contrast in taste, the same or
 * a neighboring cuisine where the catalog has one, and few shared ingredients
 * (a tomato salsa next to a tomato stew adds little). Returns nothing for
 * non-mains.
 */
export const companionsFor = (main: ProfiledRecipe, recipes: ProfiledRecipe[], limit = 3): Companion[] => {
  if (!isMain(main) || main.flavor.matched < 3) return [];
  const mine = names(main);
  return recipes
    .filter((r) => r.id !== main.id && isSideDish(r))
    .map((recipe) => {
      const theirs = names(recipe);
      let shared = 0;
      for (const n of theirs) if (mine.has(n)) shared += 1;
      const overlap = theirs.size ? shared / theirs.size : 0;
      return {
        recipe,
        score: balanceScore(main.flavor.vector, recipe.flavor.vector) + cuisineAffinity(main.area, recipe.area) * 2 - overlap * 4,
      };
    })
    .filter((c) => c.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(({ recipe }) => ({ recipe, why: reason(main.flavor.vector, recipe.flavor.vector) }));
};
