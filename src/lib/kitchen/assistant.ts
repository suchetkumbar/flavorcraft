import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { DishProblem } from '../flavor/fixes';
import type { IngredientLine } from '../flavor/profile';
import { TASTES, type TasteVector } from '../flavor/tastes';

/** Client for the `kitchen-assistant` edge function (Gemini-powered swaps and fixes). */

export interface SwapOption {
  use: string;
  amount: string;
  why: string;
  tasteShift: string;
}

export interface AiFix {
  diagnosis: string;
  steps: { action: string; amount: string; when: string; why: string }[];
}

const call = async <T>(body: Record<string, unknown>): Promise<T> => {
  if (!supabase) throw new Error('The kitchen assistant needs accounts to be set up.');
  // The function gives up on Gemini after 25s; this guards against anything else hanging.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40_000);
  let result;
  try {
    result = await supabase.functions.invoke('kitchen-assistant', { body, signal: controller.signal });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? 'The assistant took too long to answer. Try again.'
        : 'The assistant couldn’t be reached. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
  const { data, error } = result;
  if (controller.signal.aborted) throw new Error('The assistant took too long to answer. Try again.');
  if (error) {
    // Show the function's own message (sign-in needed, daily limit, etc.) when there is one.
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload?.error) throw new Error(payload.error);
    }
    throw new Error('The assistant couldn’t be reached. Check your connection and try again.');
  }
  return data as T;
};

const trimLines = (lines: IngredientLine[]) =>
  lines.slice(0, 40).map((l) => ({ name: l.name.slice(0, 80), measure: l.measure.slice(0, 60) }));

export const suggestSwaps = async (args: {
  recipeTitle: string;
  ingredients: IngredientLine[];
  ingredient: string;
  goal?: string;
}): Promise<SwapOption[]> => {
  const res = await call<{ options: SwapOption[] }>({
    action: 'swap',
    recipeTitle: args.recipeTitle.slice(0, 120),
    ingredients: trimLines(args.ingredients),
    ingredient: args.ingredient.slice(0, 80),
    ...(args.goal?.trim() && { goal: args.goal.trim().slice(0, 120) }),
  });
  return res.options;
};

export const askForFix = async (args: {
  recipeTitle: string;
  ingredients: IngredientLine[];
  steps: string[];
  problem: DishProblem;
  profile: TasteVector;
}): Promise<AiFix> =>
  call<AiFix>({
    action: 'fix',
    recipeTitle: args.recipeTitle.slice(0, 120),
    ingredients: trimLines(args.ingredients),
    steps: args.steps.slice(0, 25).map((s) => s.slice(0, 600)),
    problem: args.problem,
    profile: Object.fromEntries(TASTES.map((t, i) => [t.label.toLowerCase(), args.profile[i]])),
  });
