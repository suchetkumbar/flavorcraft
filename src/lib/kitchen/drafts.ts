import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IngredientLine } from '../flavor/profile';

/**
 * Unsaved remix edits, kept on this device so leaving a recipe page never
 * loses work. Keyed by recipe (and the remix being edited, if any).
 * Removed ingredients are stored by name, not position, so a draft still
 * applies if the recipe's ingredient order changes.
 */
export interface RemixDraft {
  removed: string[];
  added: IngredientLine[];
  updatedAt: number;
}

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const draftKey = (recipeId: string, baseRemixId: string | null) => `${recipeId}:${baseRemixId ?? ''}`;

interface DraftState {
  drafts: Record<string, RemixDraft>;
  saveDraft: (key: string, draft: Omit<RemixDraft, 'updatedAt'>) => void;
  clearDraft: (key: string) => void;
}

export const useDrafts = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (key, draft) =>
        set((s) => {
          const drafts = { ...s.drafts };
          if (draft.removed.length === 0 && draft.added.length === 0) delete drafts[key];
          else drafts[key] = { ...draft, updatedAt: Date.now() };
          return { drafts };
        }),
      clearDraft: (key) =>
        set((s) => {
          if (!(key in s.drafts)) return s;
          const drafts = { ...s.drafts };
          delete drafts[key];
          return { drafts };
        }),
    }),
    {
      name: 'flavorcraft:remix-drafts:v1',
      // Drop stale drafts whenever the store loads.
      merge: (persisted, current) => {
        const saved = (persisted as Partial<DraftState> | undefined)?.drafts ?? {};
        const now = Date.now();
        const fresh = Object.fromEntries(Object.entries(saved).filter(([, d]) => now - d.updatedAt < MAX_AGE_MS));
        return { ...current, drafts: fresh };
      },
    },
  ),
);

/** Positions in `lines` of the ingredients a draft removed, matched by name. */
export const removedIndexes = (lines: IngredientLine[], removedNames: string[]): Set<number> => {
  const remaining = [...removedNames];
  const result = new Set<number>();
  lines.forEach((line, i) => {
    const at = remaining.indexOf(line.name);
    if (at !== -1) {
      result.add(i);
      remaining.splice(at, 1);
    }
  });
  return result;
};
