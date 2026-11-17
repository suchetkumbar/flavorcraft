import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import * as remote from './remote';
import type { CookEntry, KitchenData, Remix, SavedRecipe } from './types';

/** A change waiting to be sent to the account, kept in the order it was made. */
export type PendingOp =
  | { type: 'save'; entry: SavedRecipe }
  | { type: 'unsave'; recipeId: string }
  | { type: 'remix'; remix: Remix }
  | { type: 'remixPatch'; id: string; patch: Partial<Pick<Remix, 'title' | 'note' | 'isPublic'>> }
  | { type: 'remixDelete'; id: string }
  | { type: 'cook'; entry: CookEntry }
  | { type: 'cookDelete'; id: string };

const send = (op: PendingOp): Promise<unknown> => {
  switch (op.type) {
    case 'save':
      return remote.upsertSaved([op.entry]);
    case 'unsave':
      return remote.unsaveRecipe(op.recipeId);
    case 'remix':
      return remote.upsertRemixes([op.remix]);
    case 'remixPatch':
      return remote.updateRemix(op.id, op.patch);
    case 'remixDelete':
      return remote.deleteRemix(op.id);
    case 'cook':
      return remote.upsertCooks([op.entry]);
    case 'cookDelete':
      return remote.deleteCook(op.id);
  }
};

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

interface KitchenState extends KitchenData {
  /** Account the local data belongs to; null means "this browser only". */
  ownerId: string | null;
  /** Changes made while offline that the account hasn't received yet. */
  pending: PendingOp[];

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
       * Apply a change locally right away and mirror it to the account if signed
       * in. Offline, the change is kept and queued (a cooking log entry made in a
       * kitchen with no signal must not vanish). Online, a write the account
       * refuses is rolled back.
       */
      const mutate = (change: (s: KitchenState) => Partial<KitchenState>, op: PendingOp, failure: string) => {
        const before = get();
        const snapshot = { saved: before.saved, remixes: before.remixes, cooks: before.cooks };
        set(change(before));
        if (!before.ownerId) return;
        // Anything already waiting has to go first, or the account would see changes out of order.
        if (isOffline() || before.pending.length > 0) {
          set({ pending: [...get().pending, op] });
          return;
        }
        send(op).catch(() => {
          if (isOffline()) {
            // The connection dropped mid-request: keep the change and send it later.
            set({ pending: [op, ...get().pending] });
            return;
          }
          set(snapshot);
          toast.error(failure, { description: 'Check your connection and try again.' });
        });
      };

      return {
        ...empty,
        ownerId: null,
        pending: [],

        toggleSave: (recipeId) => {
          const isSaved = get().saved.some((s) => s.recipeId === recipeId);
          if (isSaved) {
            mutate(
              (s) => ({ saved: s.saved.filter((x) => x.recipeId !== recipeId) }),
              { type: 'unsave', recipeId },
              'Couldn’t remove the recipe from your account',
            );
          } else {
            const entry: SavedRecipe = { recipeId, savedAt: new Date().toISOString() };
            mutate((s) => ({ saved: [entry, ...s.saved] }), { type: 'save', entry }, 'Couldn’t save the recipe to your account');
          }
        },

        addRemix: (input) => {
          const remix: Remix = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          mutate((s) => ({ remixes: [...s.remixes, remix] }), { type: 'remix', remix }, 'Couldn’t save the remix to your account');
          return remix;
        },

        editRemix: (id, patch) =>
          mutate(
            (s) => ({ remixes: s.remixes.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
            { type: 'remixPatch', id, patch },
            'Couldn’t update the remix',
          ),

        removeRemix: (id) =>
          mutate(
            (s) => ({
              // Children keep their changes but lose the link, matching "on delete set null".
              remixes: s.remixes.filter((r) => r.id !== id).map((r) => (r.parentRemixId === id ? { ...r, parentRemixId: null } : r)),
              cooks: s.cooks.map((c) => (c.remixId === id ? { ...c, remixId: null } : c)),
            }),
            { type: 'remixDelete', id },
            'Couldn’t delete the remix',
          ),

        logCook: (input) => {
          const entry: CookEntry = { ...input, id: crypto.randomUUID(), cookedAt: new Date().toISOString() };
          mutate((s) => ({ cooks: [entry, ...s.cooks] }), { type: 'cook', entry }, 'Couldn’t add this to your cooking log');
          return entry;
        },

        removeCook: (id) =>
          mutate((s) => ({ cooks: s.cooks.filter((c) => c.id !== id) }), { type: 'cookDelete', id }, 'Couldn’t remove the entry'),

        load: (data, ownerId) => set({ ...data, ownerId }),
        reset: () => set({ ...empty, ownerId: null, pending: [] }),
      };
    },
    {
      name: 'flavorcraft:kitchen:v1',
      partialize: ({ saved, remixes, cooks, ownerId, pending }) => ({ saved, remixes, cooks, ownerId, pending }),
    },
  ),
);

let flushing: Promise<void> | null = null;

/**
 * Sends changes made offline to the account, oldest first. Stops (keeping
 * the rest) if the connection is gone again; a change the account refuses
 * while online is dropped, and the cook is told once at the end.
 */
export const flushPending = (): Promise<void> => {
  flushing ??= (async () => {
    let sent = 0;
    let refused = 0;
    while (useKitchen.getState().ownerId && useKitchen.getState().pending.length > 0 && !isOffline()) {
      const [op] = useKitchen.getState().pending;
      try {
        await send(op);
        sent += 1;
      } catch {
        if (isOffline()) break;
        refused += 1;
      }
      // Remove exactly the one that was handled; more may have been queued meanwhile.
      useKitchen.setState((s) => ({ pending: s.pending.filter((p) => p !== op) }));
    }
    if (refused > 0) {
      toast.error(`${refused} ${refused === 1 ? 'change' : 'changes'} made offline couldn’t be saved to your account`, {
        description: 'They are still on this device. Reload the page to see what your account has.',
      });
    } else if (sent > 0) {
      toast.success(`${sent} ${sent === 1 ? 'change' : 'changes'} made offline saved to your account`);
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
};

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => void flushPending());
}

/**
 * Called when a user signs in. Data made before signing in is uploaded to the
 * account first, so nothing saved on this device is lost; then the account's
 * full kitchen replaces local state.
 */
export const syncAfterSignIn = async (userId: string) => {
  const state = useKitchen.getState();
  if (state.ownerId === userId) {
    // Same account as last time. Send anything made offline first; if some of it
    // still can't go, keep what's on this device and don't overwrite it.
    await flushPending();
    if (useKitchen.getState().pending.length > 0) return;
    useKitchen.getState().load(await remote.fetchKitchen(userId), userId);
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
