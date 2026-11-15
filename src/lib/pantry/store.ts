import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { fetchPantry, savePantry } from '../kitchen/remote';

interface PantryState {
  items: string[];
  /** Account the list belongs to; null means "this browser only". */
  ownerId: string | null;
  add: (names: string[]) => void;
  remove: (name: string) => void;
  clear: () => void;
  load: (items: string[], ownerId: string) => void;
  reset: () => void;
}

const MAX_ITEMS = 80;
const tidy = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 60);

/** Adds names not already present (case-insensitive), keeping the original order. */
export const mergeItems = (current: string[], incoming: string[]): string[] => {
  const seen = new Set(current.map((i) => i.toLowerCase()));
  const merged = [...current];
  for (const raw of incoming) {
    const name = tidy(raw);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    merged.push(name);
  }
  return merged.slice(0, MAX_ITEMS);
};

/** What's in your kitchen. Saved on this device, and mirrored to your account when signed in. */
export const usePantry = create<PantryState>()(
  persist(
    (set, get) => {
      const update = (items: string[]) => {
        set({ items });
        if (!get().ownerId) return;
        savePantry(items).catch(() =>
          toast.error('Couldn’t save your pantry to your account', {
            description: 'It’s saved on this device. Your next change will try again.',
          }),
        );
      };
      return {
        items: [],
        ownerId: null,
        add: (names) => update(mergeItems(get().items, names)),
        remove: (name) => update(get().items.filter((i) => i !== name)),
        clear: () => update([]),
        load: (items, ownerId) => set({ items, ownerId }),
        reset: () => set({ items: [], ownerId: null }),
      };
    },
    { name: 'flavorcraft:pantry:v1' },
  ),
);

/**
 * After sign-in: a pantry built on this device before signing in is merged
 * into the account's list, so nothing typed in is lost.
 */
export const syncPantryAfterSignIn = async (userId: string) => {
  const { items, ownerId, load } = usePantry.getState();
  const remote = (await fetchPantry()) ?? [];
  if (ownerId === null && items.length) {
    const merged = mergeItems(remote, items);
    await savePantry(merged);
    load(merged, userId);
  } else {
    load(remote, userId);
  }
};
