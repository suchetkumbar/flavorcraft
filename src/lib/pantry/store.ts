import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PantryState {
  items: string[];
  add: (names: string[]) => void;
  remove: (name: string) => void;
  clear: () => void;
}

const tidy = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 60);

/** What's in your kitchen. Kept on this device only. */
export const usePantry = create<PantryState>()(
  persist(
    (set) => ({
      items: [],
      add: (names) =>
        set((s) => {
          const existing = new Set(s.items.map((i) => i.toLowerCase()));
          const fresh = names.map(tidy).filter((n) => n && !existing.has(n.toLowerCase()) && existing.add(n.toLowerCase()));
          return { items: [...s.items, ...fresh].slice(0, 80) };
        }),
      remove: (name) => set((s) => ({ items: s.items.filter((i) => i !== name) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'flavorcraft:pantry:v1' },
  ),
);
