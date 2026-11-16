import { supabase } from '../supabase';
import type { DishProblem } from '../flavor/fixes';
import type { IngredientLine } from '../flavor/profile';
import type { CookEntry, KitchenData, Remix, SavedRecipe } from './types';

/** Data access for the signed-in user's kitchen. RLS limits every query to the owner. */

interface RemixRow {
  id: string;
  user_id: string;
  parent_recipe_id: string;
  parent_remix_id: string | null;
  title: string;
  note: string | null;
  ingredients: IngredientLine[];
  removed: string[];
  added: string[];
  is_public: boolean;
  created_at: string;
}

interface CookRow {
  id: string;
  recipe_id: string;
  remix_id: string | null;
  cooked_at: string;
  rating: number | null;
  problems: DishProblem[];
  note: string | null;
}

const db = () => {
  if (!supabase) throw new Error('Accounts are not configured');
  return supabase;
};

const check = <T>({ data, error }: { data: T; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message);
  return data;
};

export const toRemix = (r: RemixRow): Remix => ({
  id: r.id,
  userId: r.user_id,
  parentRecipeId: r.parent_recipe_id,
  parentRemixId: r.parent_remix_id,
  title: r.title,
  note: r.note ?? '',
  ingredients: r.ingredients,
  removed: r.removed,
  added: r.added,
  isPublic: r.is_public,
  createdAt: r.created_at,
});

const fromRemix = (r: Remix) => ({
  id: r.id,
  parent_recipe_id: r.parentRecipeId,
  parent_remix_id: r.parentRemixId,
  title: r.title,
  note: r.note || null,
  ingredients: r.ingredients,
  removed: r.removed,
  added: r.added,
  is_public: r.isPublic,
  created_at: r.createdAt,
});

const toCook = (c: CookRow): CookEntry => ({
  id: c.id,
  recipeId: c.recipe_id,
  remixId: c.remix_id,
  cookedAt: c.cooked_at,
  rating: c.rating,
  problems: c.problems,
  note: c.note ?? '',
});

const fromCook = (c: CookEntry) => ({
  id: c.id,
  recipe_id: c.recipeId,
  remix_id: c.remixId,
  cooked_at: c.cookedAt,
  rating: c.rating,
  problems: c.problems,
  note: c.note || null,
});

export const fetchKitchen = async (userId: string): Promise<KitchenData> => {
  const [saved, remixes, cooks] = await Promise.all([
    db().from('saved_recipes').select('recipe_id, saved_at'),
    db().from('remixes').select('*').eq('user_id', userId).order('created_at'),
    db().from('cook_log').select('*').order('cooked_at', { ascending: false }),
  ]);
  return {
    saved: check(saved).map((s: { recipe_id: string; saved_at: string }) => ({ recipeId: s.recipe_id, savedAt: s.saved_at })),
    remixes: (check(remixes) as RemixRow[]).map(toRemix),
    cooks: (check(cooks) as CookRow[]).map(toCook),
  };
};

export const unsaveRecipe = async (recipeId: string) =>
  check(await db().from('saved_recipes').delete().eq('recipe_id', recipeId));

export const upsertRemixes = async (remixes: Remix[]) =>
  remixes.length ? check(await db().from('remixes').upsert(remixes.map(fromRemix))) : null;

export const updateRemix = async (id: string, patch: Partial<Pick<Remix, 'title' | 'note' | 'isPublic'>>) =>
  check(
    await db()
      .from('remixes')
      .update({
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.note !== undefined && { note: patch.note || null }),
        ...(patch.isPublic !== undefined && { is_public: patch.isPublic }),
      })
      .eq('id', id),
  );

export const deleteRemix = async (id: string) => check(await db().from('remixes').delete().eq('id', id));

export const upsertCooks = async (cooks: CookEntry[]) =>
  cooks.length ? check(await db().from('cook_log').upsert(cooks.map(fromCook))) : null;

export const deleteCook = async (id: string) => check(await db().from('cook_log').delete().eq('id', id));

export const upsertSaved = async (saved: SavedRecipe[]) =>
  saved.length
    ? check(await db().from('saved_recipes').upsert(saved.map((s) => ({ recipe_id: s.recipeId, saved_at: s.savedAt }))))
    : null;

/** Public remixes of a recipe from everyone (plus your own private ones, via RLS). */
export const fetchRemixesOf = async (recipeId: string): Promise<Remix[]> =>
  (check(await db().from('remixes').select('*').eq('parent_recipe_id', recipeId).order('created_at', { ascending: false }).limit(50)) as RemixRow[]).map(toRemix);

export const fetchRemix = async (id: string): Promise<Remix | null> => {
  const rows = check(await db().from('remixes').select('*').eq('id', id).limit(1)) as RemixRow[];
  return rows[0] ? toRemix(rows[0]) : null;
};

export const fetchChildren = async (remixId: string): Promise<Remix[]> =>
  (check(await db().from('remixes').select('*').eq('parent_remix_id', remixId).order('created_at')) as RemixRow[]).map(toRemix);

/** The signed-in user's pantry list, or null if they've never saved one. */
export const fetchPantry = async (): Promise<string[] | null> => {
  const rows = check(await db().from('pantries').select('items').limit(1)) as { items: string[] }[];
  return rows[0]?.items ?? null;
};

export const savePantry = async (items: string[]) =>
  check(await db().from('pantries').upsert({ items: items.slice(0, 80), updated_at: new Date().toISOString() }));

export interface SettingsRow {
  quiz_vector: number[] | null;
  quiz_taken_at: string | null;
  household: { id: string; name: string; vector: number[] }[];
}

export const fetchSettings = async (): Promise<SettingsRow | null> => {
  const rows = check(await db().from('kitchen_settings').select('quiz_vector, quiz_taken_at, household').limit(1)) as SettingsRow[];
  return rows[0] ?? null;
};

export const saveSettings = async (row: SettingsRow) =>
  check(await db().from('kitchen_settings').upsert({ ...row, updated_at: new Date().toISOString() }));
