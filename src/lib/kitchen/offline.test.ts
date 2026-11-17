import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Same approach as kitchen.test.ts: the account is mocked, the store is real.
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
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('./remote', () => remote);
vi.mock('sonner', () => ({ toast }));

const { useKitchen, flushPending, syncAfterSignIn } = await import('./store');
const { fetchMealDbCatalog } = await import('../recipes/mealdb');

const goOffline = () => vi.stubGlobal('navigator', { onLine: false });
const goOnline = () => vi.stubGlobal('navigator', { onLine: true });
const settle = () => new Promise((r) => setTimeout(r, 0));
const cook = (recipeId: string) => useKitchen.getState().logCook({ recipeId, remixId: null, rating: 5, problems: [], note: '' });

beforeEach(() => {
  goOnline();
  useKitchen.getState().reset();
  Object.values(remote).forEach((fn) => fn.mockReset().mockResolvedValue(null));
  toast.error.mockReset();
  toast.success.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('cooking with no signal (signed in)', () => {
  beforeEach(() => useKitchen.getState().load({ saved: [], remixes: [], cooks: [] }, 'user-1'));

  it('keeps what you log offline and queues it, without complaining', () => {
    goOffline();
    cook('a');
    useKitchen.getState().toggleSave('b');
    const s = useKitchen.getState();
    expect(s.cooks.map((c) => c.recipeId)).toEqual(['a']);
    expect(s.saved.map((x) => x.recipeId)).toEqual(['b']);
    expect(s.pending.map((p) => p.type)).toEqual(['cook', 'save']);
    expect(remote.upsertCooks).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('sends queued changes in the order they were made once back online', async () => {
    goOffline();
    useKitchen.getState().toggleSave('b');
    const entry = cook('a');
    useKitchen.getState().removeCook(entry.id);
    goOnline();
    const order: string[] = [];
    remote.upsertSaved.mockImplementation(async () => void order.push('save'));
    remote.upsertCooks.mockImplementation(async () => void order.push('cook'));
    remote.deleteCook.mockImplementation(async () => void order.push('cookDelete'));

    await flushPending();
    expect(order).toEqual(['save', 'cook', 'cookDelete']);
    expect(useKitchen.getState().pending).toEqual([]);
    expect(toast.success).toHaveBeenCalledWith('3 changes made offline saved to your account');
  });

  it('queues new changes behind waiting ones even when online, so the account sees them in order', () => {
    goOffline();
    const entry = cook('a');
    goOnline();
    useKitchen.getState().removeCook(entry.id);
    expect(useKitchen.getState().pending.map((p) => p.type)).toEqual(['cook', 'cookDelete']);
    expect(remote.deleteCook).not.toHaveBeenCalled();
  });

  it('keeps a change when the connection drops in the middle of saving it', async () => {
    remote.upsertCooks.mockImplementation(async () => {
      goOffline();
      throw new Error('network');
    });
    cook('a');
    await settle();
    const s = useKitchen.getState();
    expect(s.cooks).toHaveLength(1); // not rolled back
    expect(s.pending.map((p) => p.type)).toEqual(['cook']);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('still rolls back and says so when the account refuses a change while online', async () => {
    remote.upsertCooks.mockRejectedValue(new Error('refused'));
    cook('a');
    await settle();
    expect(useKitchen.getState().cooks).toEqual([]);
    expect(useKitchen.getState().pending).toEqual([]);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('stops sending when the connection goes again, and keeps the rest for next time', async () => {
    goOffline();
    cook('a');
    cook('b');
    cook('c');
    goOnline();
    let calls = 0;
    remote.upsertCooks.mockImplementation(async () => {
      calls += 1;
      if (calls === 2) {
        goOffline();
        throw new Error('network');
      }
    });
    await flushPending();
    expect(useKitchen.getState().pending).toHaveLength(2);
    expect(toast.error).not.toHaveBeenCalled();

    goOnline();
    remote.upsertCooks.mockResolvedValue(null);
    await flushPending();
    expect(useKitchen.getState().pending).toEqual([]);
  });

  it('drops a change the account refuses, carries on with the rest, and reports it once', async () => {
    goOffline();
    cook('a');
    useKitchen.getState().toggleSave('b');
    goOnline();
    remote.upsertCooks.mockRejectedValue(new Error('refused'));
    await flushPending();
    expect(remote.upsertSaved).toHaveBeenCalledTimes(1);
    expect(useKitchen.getState().pending).toEqual([]);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error.mock.calls[0][0]).toBe('1 change made offline couldn’t be saved to your account');
  });

  it('sends offline changes before reloading from the account, and never overwrites unsent ones', async () => {
    goOffline();
    cook('a');
    // Still offline at the next visit: the device keeps its copy.
    await syncAfterSignIn('user-1');
    expect(remote.fetchKitchen).not.toHaveBeenCalled();
    expect(useKitchen.getState().cooks).toHaveLength(1);

    goOnline();
    remote.fetchKitchen.mockResolvedValue({ saved: [], remixes: [], cooks: useKitchen.getState().cooks });
    await syncAfterSignIn('user-1');
    expect(remote.upsertCooks).toHaveBeenCalledTimes(1);
    expect(remote.upsertCooks.mock.invocationCallOrder[0]).toBeLessThan(remote.fetchKitchen.mock.invocationCallOrder[0]);
    expect(useKitchen.getState().pending).toEqual([]);
  });

  it('forgets queued changes on sign-out', () => {
    goOffline();
    cook('a');
    useKitchen.getState().reset();
    expect(useKitchen.getState().pending).toEqual([]);
  });
});

describe('offline on this device only', () => {
  it('queues nothing when there is no account to send to', async () => {
    goOffline();
    cook('a');
    expect(useKitchen.getState().pending).toEqual([]);
    await flushPending();
    expect(remote.upsertCooks).not.toHaveBeenCalled();
  });
});

describe('recipe catalog with no connection', () => {
  const stale = [{ id: 'mdb-1', title: 'Old Soup', category: 'Soup', area: 'Unknown', tags: [], ingredients: [], steps: [], source: 'themealdb' }];
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))));

  it('uses a catalog older than a day rather than nothing', async () => {
    localStorage.setItem('flavorcraft:mealdb:v1', JSON.stringify({ savedAt: Date.now() - 5 * 24 * 3600 * 1000, recipes: stale }));
    expect(await fetchMealDbCatalog()).toEqual(stale);
    localStorage.removeItem('flavorcraft:mealdb:v1');
  });

  it('still fails when there has never been a catalog on this device', async () => {
    localStorage.removeItem('flavorcraft:mealdb:v1');
    await expect(fetchMealDbCatalog()).rejects.toThrow('Could not reach TheMealDB');
  });
});
