import { beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({ fetchPantry: vi.fn(), savePantry: vi.fn() }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('../kitchen/remote', () => remote);
vi.mock('sonner', () => ({ toast }));

const { mergeItems, syncPantryAfterSignIn, usePantry } = await import('./store');

beforeEach(() => {
  usePantry.getState().reset();
  remote.fetchPantry.mockReset().mockResolvedValue(null);
  remote.savePantry.mockReset().mockResolvedValue(null);
  toast.error.mockReset();
});

describe('mergeItems', () => {
  it('adds new names, ignoring case, blanks and extra spaces', () => {
    expect(mergeItems(['Eggs'], ['eggs', '  spring   onion ', '', 'Rice'])).toEqual(['Eggs', 'spring onion', 'Rice']);
  });

  it('caps the list at 80 items', () => {
    const many = Array.from({ length: 100 }, (_, i) => `item ${i}`);
    expect(mergeItems([], many)).toHaveLength(80);
  });
});

describe('pantry store', () => {
  it('stays on the device until signed in', () => {
    usePantry.getState().add(['eggs', 'rice']);
    expect(usePantry.getState().items).toEqual(['eggs', 'rice']);
    expect(remote.savePantry).not.toHaveBeenCalled();
  });

  it('saves every change to the account once signed in', () => {
    usePantry.getState().load(['eggs'], 'user-1');
    usePantry.getState().add(['rice']);
    usePantry.getState().remove('eggs');
    expect(remote.savePantry).toHaveBeenLastCalledWith(['rice']);
  });

  it('keeps the change locally and says so when saving fails', async () => {
    usePantry.getState().load([], 'user-1');
    remote.savePantry.mockRejectedValueOnce(new Error('offline'));
    usePantry.getState().add(['rice']);
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(usePantry.getState().items).toEqual(['rice']);
  });
});

describe('syncPantryAfterSignIn', () => {
  it('merges a pantry built before signing in into the account', async () => {
    usePantry.getState().add(['eggs', 'Lime']);
    remote.fetchPantry.mockResolvedValue(['lime', 'butter']);
    await syncPantryAfterSignIn('user-1');
    expect(usePantry.getState()).toMatchObject({ items: ['lime', 'butter', 'eggs'], ownerId: 'user-1' });
    expect(remote.savePantry).toHaveBeenCalledWith(['lime', 'butter', 'eggs']);
  });

  it("replaces another account's pantry instead of merging into it", async () => {
    usePantry.getState().load(['someone else'], 'user-2');
    remote.fetchPantry.mockResolvedValue(['butter']);
    await syncPantryAfterSignIn('user-1');
    expect(usePantry.getState()).toMatchObject({ items: ['butter'], ownerId: 'user-1' });
    expect(remote.savePantry).not.toHaveBeenCalled();
  });

  it('starts empty for a new account with nothing on the device', async () => {
    await syncPantryAfterSignIn('user-1');
    expect(usePantry.getState()).toMatchObject({ items: [], ownerId: 'user-1' });
  });
});
