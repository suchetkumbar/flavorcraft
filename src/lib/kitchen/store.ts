import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import * as remote from './remote';
import type { CookEntry, KitchenData, Remix, SavedRecipe } from './types';

interface KitchenState extends KitchenData {
  /** Account the local data belongs to; null means "this browser only". */
  ownerId: string | null;

  toggleSave: (recipeId: string) => void;
  addRemix: (input: Omit<Remix, 'id' | 'createdAt' | 'userId'>) => Remix;
  editRemix: (id: string, patch: Partial<Pick<Remix, 'title' | 'note' | 'isPublic'>>) => void;
  removeRemix: (id: string) => void;
  logCook: (input: Omit<CookEntry, 'id' | 'cookedAt'>) => CookEntry;
  removeCook: (id: string) => void;

  /** Replace everything with an account's data (after sign-in). */
  load: (data: KitchenData, ownerId: string) => void;
  /** Forget all local data (after sign-out). */
  reset: () => void;
}

const empty: KitchenData = { saved: [], remixes: [], cooks: [] };

export const useKitchen = create<KitchenState>()(
  persist(
    (set, get) => {
      /**
       * Apply a change locally right away, mirror it to the account if signed in,
       * and roll back if the account write fails.
       */
      const mutate = (change: (s: KitchenState) => Partial<KitchenState>, push: () => Promise<unknown>, failure: string) => {
        const before = get();
        const snapshot = { saved: before.saved, remixes: before.remixes, cooks: before.cooks };
        set(change(before));
        if (!before.ownerId) return;
        push().catch(() => {
          set(snapshot);
          toast.error(failure, { description: 'Check your connection and try again.' });
        });
      };

      return {
        ...empty,
        ownerId: null,

        toggleSave: (recipeId) => {
          const isSaved = get().saved.some((s) => s.recipeId === recipeId);
          if (isSaved) {
            mutate(
              (s) => ({ saved: s.saved.filter((x) => x.recipeId !== recipeId) }),
              () => remote.unsaveRecipe(recipeId),
              'Couldn’t remove the recipe from your account',
            );
          } else {
            const entry: SavedRecipe = { recipeId, savedAt: new Date().toISOString() };
            mutate((s) => ({ saved: [entry, ...s.saved] }), () => remote.upsertSaved([entry]), 'Couldn’t save the recipe to your account');
          }
        },

        addRemix: (input) => {
          const remix: Remix = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          mutate((s) => ({ remixes: [...s.remixes, remix] }), () => remote.upsertRemixes([remix]), 'Couldn’t save the remix to your account');
          return remix;
        },

        editRemix: (id, patch) =>
          mutate(
            (s) => ({ remixes: s.remixes.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
            () => remote.updateRemix(id, patch),
            'Couldn’t update the remix',
          ),

        removeRemix: (id) =>
          mutate(
            (s) => ({
              // Children keep their changes but lose the link, matching "on delete set null".
              remixes: s.remixes.filter((r) => r.id !== id).map((r) => (r.parentRemixId === id ? { ...r, parentRemixId: null } : r)),
              cooks: s.cooks.map((c) => (c.remixId === id ? { ...c, remixId: null } : c)),
            }),
            () => remote.deleteRemix(id),
            'Couldn’t delete the remix',
          ),

        logCook: (input) => {
          const entry: CookEntry = { ...input, id: crypto.randomUUID(), cookedAt: new Date().toISOString() };
          mutate((s) => ({ cooks: [entry, ...s.cooks] }), () => remote.upsertCooks([entry]), 'Couldn’t add this to your cooking log');
          return entry;
        },

        removeCook: (id) =>
          mutate((s) => ({ cooks: s.cooks.filter((c) => c.id !== id) }), () => remote.deleteCook(id), 'Couldn’t remove the entry'),

        load: (data, ownerId) => set({ ...data, ownerId }),
        reset: () => set({ ...empty, ownerId: null }),
      };
    },
    {
      name: 'flavorcraft:kitchen:v1',
      partialize: ({ saved, remixes, cooks, ownerId }) => ({ saved, remixes, cooks, ownerId }),
    },
  ),
);

/**
 * Called when a user signs in. Data made before signing in is uploaded to the
 * account first, so nothing saved on this device is lost; then the account's
 * full kitchen replaces local state.
 */
export const syncAfterSignIn = async (userId: string) => {
  const state = useKitchen.getState();
  if (state.ownerId === userId) {
    // Same account as last time: refresh from the server.
    state.load(await remote.fetchKitchen(userId), userId);
    return;
  }
  if (state.ownerId === null) {
    const remixes = [...state.remixes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    await remote.upsertSaved(state.saved);
    await remote.upsertRemixes(remixes); // oldest first, so parents exist before forks
    await remote.upsertCooks(state.cooks);
  }
  useKitchen.getState().load(await remote.fetchKitchen(userId), userId);
};
