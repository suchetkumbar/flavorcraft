import { beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({ fetchSettings: vi.fn(), saveSettings: vi.fn() }));
vi.mock('./remote', () => remote);
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { MAX_MEMBERS, syncSettingsAfterSignIn, useTasteSettings } = await import('./settings');
const v = (x: number) => [x, x, x, x, x, x, x, x] as [number, number, number, number, number, number, number, number];

beforeEach(() => {
  useTasteSettings.getState().reset();
  remote.fetchSettings.mockReset().mockResolvedValue(null);
  remote.saveSettings.mockReset().mockResolvedValue(null);
});

describe('taste settings', () => {
  it('adds, edits and removes household members, up to the limit', () => {
    const s = useTasteSettings.getState();
    s.saveMember({ id: 'a', name: 'Sam', vector: v(1) });
    s.saveMember({ id: 'a', name: 'Sammy', vector: v(2) });
    expect(useTasteSettings.getState().household).toEqual([{ id: 'a', name: 'Sammy', vector: v(2) }]);
    for (let i = 0; i < 20; i++) useTasteSettings.getState().saveMember({ id: `m${i}`, name: `M${i}`, vector: v(1) });
    expect(useTasteSettings.getState().household).toHaveLength(MAX_MEMBERS);
    useTasteSettings.getState().removeMember('a');
    expect(useTasteSettings.getState().household.find((m) => m.id === 'a')).toBeUndefined();
  });

  it('merges device settings into the account on first sign-in, keeping the newer quiz', async () => {
    useTasteSettings.setState({ quiz: { vector: v(5), takenAt: '2026-11-10T00:00:00Z' }, household: [{ id: 'local', name: 'Kid', vector: v(1) }] });
    remote.fetchSettings.mockResolvedValue({ quiz_vector: v(2), quiz_taken_at: '2026-01-01T00:00:00Z', household: [{ id: 'remote', name: 'Partner', vector: v(3) }] });
    await syncSettingsAfterSignIn('user-1');
    const s = useTasteSettings.getState();
    expect(s.quiz?.vector).toEqual(v(5));
    expect(s.household.map((m) => m.id)).toEqual(['remote', 'local']);
    expect(s.ownerId).toBe('user-1');
    expect(remote.saveSettings).toHaveBeenCalledOnce();
  });

  it("replaces another account's settings rather than merging", async () => {
    useTasteSettings.setState({ quiz: { vector: v(5), takenAt: '2026-11-10T00:00:00Z' }, household: [], ownerId: 'user-2' });
    await syncSettingsAfterSignIn('user-1');
    expect(useTasteSettings.getState()).toMatchObject({ quiz: null, household: [], ownerId: 'user-1' });
    expect(remote.saveSettings).not.toHaveBeenCalled();
  });
});
