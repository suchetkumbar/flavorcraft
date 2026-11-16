import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { fetchSettings, saveSettings, type SettingsRow } from './remote';
import type { TasteVector } from '../flavor/tastes';
import type { HouseholdMember } from './household';

export interface QuizTaken {
  vector: TasteVector;
  takenAt: string;
}

interface SettingsState {
  quiz: QuizTaken | null;
  household: HouseholdMember[];
  ownerId: string | null;
  setQuiz: (vector: TasteVector) => void;
  clearQuiz: () => void;
  saveMember: (member: HouseholdMember) => void;
  removeMember: (id: string) => void;
  load: (row: SettingsRow | null, ownerId: string) => void;
  reset: () => void;
}

export const MAX_MEMBERS = 8;

const toRow = (s: Pick<SettingsState, 'quiz' | 'household'>): SettingsRow => ({
  quiz_vector: s.quiz?.vector ?? null,
  quiz_taken_at: s.quiz?.takenAt ?? null,
  household: s.household,
});

const fromRow = (row: SettingsRow | null): Pick<SettingsState, 'quiz' | 'household'> => ({
  quiz: row?.quiz_vector && row.quiz_taken_at ? { vector: row.quiz_vector as TasteVector, takenAt: row.quiz_taken_at } : null,
  household: (row?.household ?? []) as HouseholdMember[],
});

/** Taste quiz result and the people you cook for. On this device, mirrored to your account when signed in. */
export const useTasteSettings = create<SettingsState>()(
  persist(
    (set, get) => {
      const update = (patch: Partial<Pick<SettingsState, 'quiz' | 'household'>>) => {
        set(patch);
        if (!get().ownerId) return;
        saveSettings(toRow(get())).catch(() =>
          toast.error('Couldn’t save to your account', { description: 'It’s saved on this device. Your next change will try again.' }),
        );
      };
      return {
        quiz: null,
        household: [],
        ownerId: null,
        setQuiz: (vector) => update({ quiz: { vector, takenAt: new Date().toISOString() } }),
        clearQuiz: () => update({ quiz: null }),
        saveMember: (member) => {
          const others = get().household.filter((m) => m.id !== member.id);
          const exists = others.length !== get().household.length;
          if (!exists && others.length >= MAX_MEMBERS) return;
          update({ household: exists ? get().household.map((m) => (m.id === member.id ? member : m)) : [...others, member] });
        },
        removeMember: (id) => update({ household: get().household.filter((m) => m.id !== id) }),
        load: (row, ownerId) => set({ ...fromRow(row), ownerId }),
        reset: () => set({ quiz: null, household: [], ownerId: null }),
      };
    },
    { name: 'flavorcraft:taste-settings:v1' },
  ),
);

/**
 * After sign-in: settings made on this device before signing in are merged in.
 * The newer quiz wins; household members are combined by id.
 */
export const syncSettingsAfterSignIn = async (userId: string) => {
  const local = useTasteSettings.getState();
  const remoteRow = await fetchSettings();
  if (local.ownerId !== null) {
    local.load(remoteRow, userId);
    return;
  }
  const remote = fromRow(remoteRow);
  const quiz = [local.quiz, remote.quiz].filter((q): q is QuizTaken => q !== null).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0] ?? null;
  const ids = new Set(remote.household.map((m) => m.id));
  const household = [...remote.household, ...local.household.filter((m) => !ids.has(m.id))].slice(0, MAX_MEMBERS);
  const merged = { quiz, household };
  if (local.quiz || local.household.length) await saveSettings(toRow(merged));
  useTasteSettings.setState({ ...merged, ownerId: userId });
};
