import { describe, expect, it } from 'vitest';
import { balanceWarnings } from './balance';
import { compareProfiles, explainDifferences, similarity } from './compare';
import { computeProfile, type FlavorProfile } from './profile';
import type { TasteVector } from './tastes';

const flavor = (vector: TasteVector, matched = 10, total = 10): FlavorProfile => ({
  vector,
  sources: vector.map(() => []),
  matched,
  total,
});

describe('balanceWarnings', () => {
  it('flags a rich dish with no acid', () => {
    expect(balanceWarnings(flavor([2, 3, 1, 1, 5, 1, 8, 4]))[0]).toMatchObject({ id: 'rich-no-acid', problem: 'too-heavy' });
  });

  it('leaves rich desserts alone', () => {
    expect(balanceWarnings(flavor([8, 1, 1, 1, 1, 0, 9, 4]))).toEqual([]);
  });

  it('flags a savory dish that has gone sweet, but not a sweet dessert', () => {
    expect(balanceWarnings(flavor([8, 4, 1, 0, 6, 2, 3, 4]))[0]?.id).toBe('savory-too-sweet');
    expect(balanceWarnings(flavor([9, 1, 1, 0, 1, 0, 3, 4]))).toEqual([]);
  });

  it('flags heat with nothing to cool it', () => {
    expect(balanceWarnings(flavor([1, 4, 2, 1, 4, 8, 2, 6]))[0]?.id).toBe('hot-no-cooling');
  });

  it('stays quiet for balanced dishes', () => {
    expect(balanceWarnings(flavor([4, 5, 5, 2, 5, 3, 5, 6]))).toEqual([]);
  });

  it('does not guess when too few ingredients are profiled', () => {
    expect(balanceWarnings(flavor([2, 3, 1, 1, 5, 1, 8, 4], 5, 10))).toEqual([]);
  });
});

describe('compare', () => {
  const prawns = computeProfile([
    { name: 'Prawns', measure: '' },
    { name: 'Tamarind Paste', measure: '' },
    { name: 'Red Chilli', measure: '' },
    { name: 'Fish Sauce', measure: '' },
  ]);
  const pannaCotta = computeProfile([
    { name: 'Double Cream', measure: '' },
    { name: 'Honey', measure: '' },
    { name: 'Vanilla', measure: '' },
  ]);

  it('lists the biggest differences first, with the ingredients behind them', () => {
    const diffs = compareProfiles(prawns, pannaCotta);
    expect(Math.abs(diffs[0].delta)).toBeGreaterThanOrEqual(Math.abs(diffs[diffs.length - 1].delta));
    const heat = diffs.find((d) => d.taste === 5)!;
    expect(heat.delta).toBeGreaterThan(0);
    expect(heat.because).toContain('Red Chilli');
  });

  it('explains differences in plain sentences', () => {
    const lines = explainDifferences('Prawns', 'Panna cotta', compareProfiles(prawns, pannaCotta), 8);
    expect(lines).toContain('Prawns is hotter, from the red chilli.');
    expect(lines.some((l) => /^Panna cotta is richer, from the double cream/.test(l))).toBe(true);
  });

  it('scores identical dishes 100 and opposites low', () => {
    expect(similarity(prawns, prawns)).toBe(100);
    expect(similarity(flavor([0, 0, 0, 0, 0, 0, 0, 0]), flavor([10, 10, 10, 10, 10, 10, 10, 10]))).toBe(0);
  });
});
