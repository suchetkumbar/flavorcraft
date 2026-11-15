import { describe, expect, it } from 'vitest';
import { matchIngredient, normalizeIngredient } from './ingredients';
import { computeProfile } from './profile';
import { applyEffect, fixesFor } from './fixes';
import { TASTE_KEYS, clampVector, describeProfile, dominantIndex, type TasteVector } from './tastes';

const at = (v: TasteVector, key: (typeof TASTE_KEYS)[number]) => v[TASTE_KEYS.indexOf(key)];

describe('normalizeIngredient', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalizeIngredient('  Crème Fraîche (full-fat) ')).toBe('creme fraiche full fat');
  });
});

describe('matchIngredient', () => {
  it('prefers the longest matching key', () => {
    expect(matchIngredient('Brown Sugar')?.key).toBe('brown sugar');
    expect(matchIngredient('Extra Virgin Olive Oil')?.key).toBe('olive oil');
    expect(matchIngredient('Salted Butter')?.key).toBe('butter');
    expect(matchIngredient('Chicken Stock')?.key).toBe('chicken stock');
  });

  it('only matches at the start of a word', () => {
    expect(matchIngredient('Cornflour')?.key).toBe('cornflour'); // not "corn"
    expect(matchIngredient('Kale')?.key).toBe('kale'); // not "ale"
    expect(matchIngredient('Sausages')?.key).toBe('sausage'); // not "sage"
    // No longer key covers these, so only word-start matching keeps them out.
    expect(matchIngredient('Champagne')).toBeNull(); // contains "ham"
    expect(matchIngredient('Escalope')).toBeNull(); // contains "ale"
  });

  it('matches plural and stem forms', () => {
    expect(matchIngredient('Strawberries')?.key).toBe('strawberr');
    expect(matchIngredient('Cherry Tomatoes')?.key).toBe('tomato');
  });

  it('returns null for unknown ingredients', () => {
    expect(matchIngredient('Xanthan Gum')).toBeNull();
  });
});

describe('computeProfile', () => {
  it('keeps every dimension within 0–10 even with many strong ingredients', () => {
    const lines = ['Sugar', 'Honey', 'Maple Syrup', 'Condensed Milk', 'Brown Sugar', 'Jam'].map((name) => ({ name, measure: '1 cup' }));
    const { vector } = computeProfile(lines);
    expect(vector.every((x) => x >= 0 && x <= 10)).toBe(true);
    expect(at(vector, 'sweet')).toBeGreaterThan(8);
  });

  it('applies diminishing returns: a second salty ingredient adds less than the first', () => {
    const one = at(computeProfile([{ name: 'Salt', measure: '1 tbsp' }]).vector, 'salty');
    const two = at(computeProfile([{ name: 'Salt', measure: '1 tbsp' }, { name: 'Soy Sauce', measure: '1 tbsp' }]).vector, 'salty');
    expect(two).toBeGreaterThan(one);
    expect(two - one).toBeLessThan(one);
  });

  it('weights small amounts less', () => {
    const pinch = at(computeProfile([{ name: 'Cayenne', measure: 'pinch' }]).vector, 'heat');
    const full = at(computeProfile([{ name: 'Cayenne', measure: '2 tbsp' }]).vector, 'heat');
    expect(pinch).toBeLessThan(full);
  });

  it('reports coverage and the ingredients behind each taste', () => {
    const p = computeProfile([
      { name: 'Lime', measure: '1' },
      { name: 'Fish Sauce', measure: '1 tbsp' },
      { name: 'Mystery Powder', measure: '1 tsp' },
    ]);
    expect(p.matched).toBe(2);
    expect(p.total).toBe(3);
    expect(p.sources[TASTE_KEYS.indexOf('sour')]).toContain('Lime');
    expect(p.sources[TASTE_KEYS.indexOf('umami')]).toContain('Fish Sauce');
  });

  it('returns an all-zero profile for no ingredients', () => {
    expect(computeProfile([]).vector).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('fixes', () => {
  it('puts the fix for a missing taste first', () => {
    // A flat dish that is already salty but has no acid: acid should lead.
    const salty: TasteVector = [2, 9, 0, 1, 4, 1, 3, 3];
    expect(fixesFor('flat', salty)[0].action).toBe('Add acid');
    // And a flat dish with plenty of acid but no salt: salt should lead.
    const sour: TasteVector = [2, 0, 9, 1, 4, 1, 3, 3];
    expect(fixesFor('flat', sour)[0].action).toBe('Add salt');
  });

  it('adds a note when the main taste is already high or missing', () => {
    const fixes = fixesFor('flat', [2, 9, 0, 1, 4, 1, 3, 3]);
    const salt = fixes.find((f) => f.action === 'Add salt')!;
    expect(salt.note).toMatch(/already high in salty/);
  });

  it('applyEffect clamps results to 0–10', () => {
    const v = applyEffect([9, 0.5, 0, 0, 0, 0, 0, 0], { sweet: 5, salty: -3 });
    expect(v[0]).toBe(10);
    expect(v[1]).toBe(0);
  });
});

describe('taste helpers', () => {
  it('clampVector bounds values', () => {
    expect(clampVector([-1, 11, 5, 0, 0, 0, 0, 0])).toEqual([0, 10, 5, 0, 0, 0, 0, 0]);
  });

  it('dominantIndex finds the strongest taste, or -1 when empty', () => {
    expect(dominantIndex([1, 2, 8, 0, 0, 0, 0, 0])).toBe(2);
    expect(dominantIndex([0, 0, 0, 0, 0, 0, 0, 0])).toBe(-1);
  });

  it('describeProfile lists strong tastes in order', () => {
    expect(describeProfile([0, 0, 0, 0, 0, 0, 0, 0])).toBe('Mild, with no strong taste');
    expect(describeProfile([0, 0, 7, 0, 0, 9, 0, 0])).toBe('Mostly heat and sour');
    expect(describeProfile([5, 0, 0, 0, 0, 0, 0, 0])).toBe('Mostly sweet');
  });
});
