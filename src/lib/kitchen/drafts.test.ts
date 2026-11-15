import { beforeEach, describe, expect, it } from 'vitest';
import { draftKey, removedIndexes, useDrafts } from './drafts';

const lines = (...names: string[]) => names.map((name) => ({ name, measure: '' }));

beforeEach(() => useDrafts.setState({ drafts: {} }));

describe('remix drafts', () => {
  it('keys drafts by recipe and the remix being edited', () => {
    expect(draftKey('fc-x', null)).toBe('fc-x:');
    expect(draftKey('fc-x', 'abc')).toBe('fc-x:abc');
  });

  it('stores edits and forgets a draft once it has no changes', () => {
    const { saveDraft } = useDrafts.getState();
    saveDraft('k', { removed: ['Garlic'], added: [] });
    expect(useDrafts.getState().drafts.k?.removed).toEqual(['Garlic']);
    saveDraft('k', { removed: [], added: [] });
    expect(useDrafts.getState().drafts.k).toBeUndefined();
  });

  it('clears a draft after saving', () => {
    useDrafts.getState().saveDraft('k', { removed: [], added: lines('Lime') });
    useDrafts.getState().clearDraft('k');
    expect(useDrafts.getState().drafts).toEqual({});
  });

  it('restores removed ingredients by name, even if the order changed', () => {
    const now = lines('Onion', 'Garlic', 'Chilli', 'Garlic');
    expect([...removedIndexes(now, ['Chilli', 'Onion'])].sort()).toEqual([0, 2]);
    // Duplicate names are restored once per removal.
    expect([...removedIndexes(now, ['Garlic'])]).toEqual([1]);
    // Names that no longer exist are ignored.
    expect(removedIndexes(now, ['Saffron']).size).toBe(0);
  });

  it('drops drafts older than two weeks when loading', async () => {
    const old = Date.now() - 15 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      'flavorcraft:remix-drafts:v1',
      JSON.stringify({ state: { drafts: { stale: { removed: ['A'], added: [], updatedAt: old }, fresh: { removed: ['B'], added: [], updatedAt: Date.now() } } }, version: 0 }),
    );
    await useDrafts.persist.rehydrate();
    expect(Object.keys(useDrafts.getState().drafts)).toEqual(['fresh']);
  });
});
