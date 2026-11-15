import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeProfile } from '../flavor/profile';
import { ORIGINAL_RECIPES } from '../recipes/originals';
import type { ProfiledRecipe } from '../recipes/types';
import { buildTasteProfile, catalogAverage, matchReason, recommend, standouts } from './tasteProfile';

// Remote calls are mocked so the store can be tested in both local and signed-in modes.
const remote = vi.hoisted(() => ({
  upsertSaved: vi.fn(),
  unsaveRecipe: vi.fn(),
  upsertRemixes: vi.fn(),
  updateRemix: vi.fn(),
  deleteRemix: vi.fn(),
  upsertCooks: vi.fn(),
  deleteCook: vi.fn(),
  fetchKitchen: vi.fn(),
}));
vi.mock('./remote', () => remote);
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { useKitchen } = await import('./store');

const recipes: ProfiledRecipe[] = ORIGINAL_RECIPES.map((r) => ({ ...r, flavor: computeProfile(r.ingredients) }));
const byId = new Map(recipes.map((r) => [r.id, r]));
const chilli = byId.get('fc-smoky-black-bean-chilli')!;

const newRemix = (parentRemixId: string | null = null) =>
  useKitchen.getState().addRemix({
    parentRecipeId: chilli.id,
    parentRemixId,
    title: 'Test remix',
    note: '',
    ingredients: chilli.ingredients,
    removed: [],
    added: [],
    isPublic: false,
  });

beforeEach(() => {
  useKitchen.getState().reset();
  Object.values(remote).forEach((fn) => fn.mockReset().mockResolvedValue(null));
});

describe('kitchen store (this device only)', () => {
  it('toggles saved recipes without calling the server', () => {
    const { toggleSave } = useKitchen.getState();
    toggleSave('a');
    toggleSave('b');
    toggleSave('a');
    expect(useKitchen.getState().saved.map((s) => s.recipeId)).toEqual(['b']);
    expect(remote.upsertSaved).not.toHaveBeenCalled();
  });

  it('unlinks forks and cook entries when a remix is deleted', () => {
    const parent = newRemix();
    const child = newRemix(parent.id);
    useKitchen.getState().logCook({ recipeId: chilli.id, remixId: parent.id, rating: 4, problems: [], note: '' });

    useKitchen.getState().removeRemix(parent.id);
    const s = useKitchen.getState();
    expect(s.remixes.map((r) => r.id)).toEqual([child.id]);
    expect(s.remixes[0].parentRemixId).toBeNull();
    expect(s.cooks[0].remixId).toBeNull();
  });
});

describe('kitchen store (signed in)', () => {
  beforeEach(() => useKitchen.getState().load({ saved: [], remixes: [], cooks: [] }, 'user-1'));

  it('mirrors changes to the account', () => {
    useKitchen.getState().toggleSave('a');
    expect(remote.upsertSaved).toHaveBeenCalledWith([expect.objectContaining({ recipeId: 'a' })]);
  });

  it('rolls back a change the server rejects', async () => {
    remote.upsertSaved.mockRejectedValueOnce(new Error('offline'));
    useKitchen.getState().toggleSave('a');
    expect(useKitchen.getState().saved).toHaveLength(1); // optimistic
    await vi.waitFor(() => expect(useKitchen.getState().saved).toHaveLength(0));
  });
});

describe('taste profile', () => {
  it('is null with nothing saved or cooked', () => {
    expect(buildTasteProfile({ saved: [], remixes: [], cooks: [] }, byId)).toBeNull();
  });

  it('shifts away from problems that keep coming up, and says so', () => {
    const cook = (problems: ('too-spicy')[]) => ({
      id: crypto.randomUUID(),
      recipeId: 'fc-tamarind-chilli-prawns',
      remixId: null,
      cookedAt: new Date().toISOString(),
      rating: 4,
      problems,
      note: '',
    });
    const plain = buildTasteProfile({ saved: [], remixes: [], cooks: [cook([]), cook([])] }, byId)!;
    const spicy = buildTasteProfile({ saved: [], remixes: [], cooks: [cook(['too-spicy']), cook(['too-spicy'])] }, byId)!;
    const heat = 5;
    expect(spicy.vector[heat]).toBeLessThan(plain.vector[heat]);
    expect(spicy.adjustments[0]).toMatch(/too spicy/);
  });

  it('recommends close recipes and never ones you excluded', () => {
    const target = byId.get('fc-tamarind-chilli-prawns')!.flavor.vector;
    const picks = recommend(target, recipes, new Set(['fc-tamarind-chilli-prawns']), 3);
    expect(picks).toHaveLength(3);
    expect(picks.map((r) => r.id)).not.toContain('fc-tamarind-chilli-prawns');
  });

  it('describes differences from the average recipe in plain words', () => {
    const avg = catalogAverage(recipes);
    expect(standouts([avg[0], avg[1], avg[2], avg[3], avg[4], 10, avg[6], avg[7]], avg)).toEqual(['Hotter than most recipes']);
    expect(standouts(avg, avg)).toEqual([]);
  });

  it('explains a match by the tastes it shares with you', () => {
    expect(matchReason([0, 0, 8, 0, 0, 7, 0, 0], [0, 0, 6, 0, 0, 9, 0, 0])).toBe('Matches your taste for heat and sourness');
    expect(matchReason([1, 1, 1, 1, 1, 1, 1, 1], [9, 9, 9, 9, 9, 9, 9, 9])).toBe('Close to your overall balance');
  });
});
