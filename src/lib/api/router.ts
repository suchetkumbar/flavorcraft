/**
 * The public API's request handling, written against web-standard Request and
 * Response so it runs unchanged in the Supabase function and in tests. The
 * function supplies the three things that need a network or a renderer.
 */
import type { IngredientLine } from '../flavor/profile';
import { normalizeMeal } from '../recipes/mealdb';
import { ORIGINAL_RECIPES } from '../recipes/originals';
import { chartSvg, drinksResponse, engineFingerprint, parseIngredients, profileResponse, remixCard, swapsResponse, vectorOf } from './engine';

export * from './engine';

export interface PublicRemix {
  id: string;
  title: string;
  note: string | null;
  parent_recipe_id: string;
  ingredients: IngredientLine[];
  removed: string[];
  added: string[];
  created_at: string;
}

export interface ApiDeps {
  /** A remix by id as an anonymous visitor would see it: null unless it is public. */
  fetchRemix: (id: string) => Promise<PublicRemix | null>;
  /** The raw TheMealDB record for a meal id, or null. May throw; the card works without it. */
  fetchMeal: (mealId: string) => Promise<unknown | null>;
  /** Renders SVG markup to PNG bytes. */
  toPng: (svg: string) => Promise<Uint8Array>;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const HOUR = 'public, max-age=3600';
const TEN_MINUTES = 'public, max-age=600';

const json = (body: unknown, status = 200, cache = HOUR) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': status === 200 ? cache : 'no-store' },
  });
const fail = (status: number, error: string) => json({ error }, status);
const svg = (body: string, cache = HOUR) =>
  new Response(body, {
    headers: {
      ...cors,
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
      // An SVG opened directly is a document: make sure it can never run anything.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NEED = 'Give 1 to 60 ingredients, e.g. ?ingredients=lime,fish sauce,chilli';

export const API_INDEX = {
  name: 'FlavorCraft flavor API',
  about: 'Flavor profiles are culinary estimates from a hand-tuned ingredient table. Free to use; please cache responses.',
  endpoints: {
    'GET /profile?ingredients=lime,fish sauce,chilli': 'Taste profile for a list of ingredients (also POST {ingredients: [...]})',
    'GET /chart.svg?ingredients=...&title=...&size=420': 'The profile as an SVG chart, for <img> embeds',
    'GET /swaps?ingredient=butter': 'Ingredients that can stand in for one another, and why',
    'GET /drinks?ingredients=...&alcohol=false': 'Drinks that balance or echo the dish',
    'GET /remix/{id}': 'A public remix with its taste profile',
    'GET /remix/{id}/card.png': 'The 1200x630 share image for a public remix (card.svg also works)',
  },
};

/** The recipe a remix started from: a FlavorCraft original, or looked up on TheMealDB. */
const originalOf = async (recipeId: string, deps: ApiDeps): Promise<{ title: string; ingredients: IngredientLine[] } | null> => {
  const own = ORIGINAL_RECIPES.find((r) => r.id === recipeId);
  if (own) return own;
  const mealId = /^mdb-(\d+)$/.exec(recipeId)?.[1];
  if (!mealId) return null;
  try {
    const meal = await deps.fetchMeal(mealId);
    return meal ? normalizeMeal(meal as Parameters<typeof normalizeMeal>[0]) : null;
  } catch {
    // The card still works without the original: it just has no comparison outline.
    return null;
  }
};

export const handleApi = async (req: Request, deps: ApiDeps): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET' && req.method !== 'POST') return fail(405, 'Use GET or POST.');

  const url = new URL(req.url);
  // Supabase serves the function under /functions/v1/flavor-api (or /flavor-api): keep what follows.
  const path = url.pathname.replace(/^.*\/flavor-api/, '').replace(/\/+$/, '') || '/';

  try {
    if (path === '/') return json({ ...API_INDEX, engine: engineFingerprint() });

    // Ingredient lists come from the query string, or from a JSON body on POST.
    const ingredients = async () => {
      if (req.method === 'POST') {
        const body = (await req.json().catch(() => null)) as { ingredients?: unknown } | null;
        return parseIngredients(body?.ingredients);
      }
      return parseIngredients(url.searchParams.get('ingredients') ?? '');
    };

    if (path === '/profile') {
      const lines = await ingredients();
      return lines ? json(profileResponse(lines)) : fail(400, NEED);
    }
    if (path === '/chart.svg') {
      const lines = await ingredients();
      if (!lines) return fail(400, NEED);
      const size = Number(url.searchParams.get('size')) || 420;
      return svg(chartSvg(vectorOf(lines), { title: url.searchParams.get('title') ?? undefined, size }));
    }
    if (path === '/drinks') {
      const lines = await ingredients();
      return lines ? json(drinksResponse(lines, url.searchParams.get('alcohol') !== 'false')) : fail(400, NEED);
    }
    if (path === '/swaps') {
      const ingredient = (url.searchParams.get('ingredient') ?? '').trim().slice(0, 80);
      return ingredient ? json(swapsResponse(ingredient)) : fail(400, 'Give an ingredient, e.g. ?ingredient=butter');
    }

    const remixRoute = /^\/remix\/([^/]+)(?:\/(card\.png|card\.svg))?$/.exec(path);
    if (remixRoute) {
      const [, id, card] = remixRoute;
      if (!UUID.test(id)) return fail(400, "That isn't a remix id.");
      const remix = await deps.fetchRemix(id);
      if (!remix) return fail(404, 'No public remix has that id.');
      const original = await originalOf(remix.parent_recipe_id, deps);
      if (!card) {
        return json(
          {
            id: remix.id,
            title: remix.title,
            note: remix.note ?? '',
            remixOf: original ? { id: remix.parent_recipe_id, title: original.title } : { id: remix.parent_recipe_id },
            removed: remix.removed,
            added: remix.added,
            ingredients: remix.ingredients,
            createdAt: remix.created_at,
            profile: profileResponse(remix.ingredients),
          },
          200,
          TEN_MINUTES,
        );
      }
      const markup = remixCard(remix, original);
      if (card === 'card.svg') return svg(markup, TEN_MINUTES);
      const png = await deps.toPng(markup);
      return new Response(png as BodyInit, { headers: { ...cors, 'Content-Type': 'image/png', 'Cache-Control': TEN_MINUTES } });
    }

    return fail(404, 'No such endpoint. GET / lists them.');
  } catch (err) {
    console.error('flavor-api failed', path, err);
    return fail(500, 'Something went wrong computing that. Try again.');
  }
};
