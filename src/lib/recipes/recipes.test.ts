import { describe, expect, it } from 'vitest';
import { normalizeMeal } from './mealdb';
import { findTimers, formatClock } from './timers';
import { ORIGINAL_RECIPES } from './originals';
import { computeProfile } from '../flavor/profile';

describe('normalizeMeal', () => {
  const meal = {
    idMeal: '52772',
    strMeal: ' Teriyaki Chicken Casserole ',
    strCategory: 'Chicken',
    strArea: 'Japanese',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/x.jpg',
    strTags: 'Meat,Casserole',
    strYoutube: '',
    strSource: null,
    strInstructions: 'STEP 1\r\nPreheat oven to 350° F.\r\n\r\n2. Combine soy sauce and sugar.\r\nSTEP 3\r\nBake for 35 minutes.',
    strIngredient1: 'soy sauce',
    strMeasure1: '3/4 cup',
    strIngredient2: '',
    strMeasure2: '',
    strIngredient3: 'Brown Sugar',
    strMeasure3: ' 1/2 cup ',
    strIngredient4: null,
  };

  it('maps fields and prefixes the id', () => {
    const r = normalizeMeal(meal as never);
    expect(r.id).toBe('mdb-52772');
    expect(r.title).toBe('Teriyaki Chicken Casserole');
    expect(r.tags).toEqual(['Meat', 'Casserole']);
    expect(r.videoUrl).toBeUndefined();
    expect(r.source).toBe('themealdb');
  });

  it('keeps only filled ingredient slots, trimmed', () => {
    const r = normalizeMeal(meal as never);
    expect(r.ingredients).toEqual([
      { name: 'soy sauce', measure: '3/4 cup' },
      { name: 'Brown Sugar', measure: '1/2 cup' },
    ]);
  });

  it('splits steps and drops "STEP n" headers and numbering', () => {
    const r = normalizeMeal(meal as never);
    expect(r.steps).toEqual(['Preheat oven to 350° F.', 'Combine soy sauce and sugar.', 'Bake for 35 minutes.']);
  });
});

describe('findTimers', () => {
  it.each([
    ['Roast for 30 minutes.', ['30 minutes'], [1800]],
    ['Grill 3–4 minutes a side.', ['3–4 minutes'], [240]],
    ['Chill for at least 4 hours.', ['4 hours'], [14400]],
    ['Fry for 30 seconds, then rest 1 hr.', ['30 seconds', '1 hr'], [30, 3600]],
  ])('%s', (step, labels, seconds) => {
    const timers = findTimers(step);
    expect(timers.map((t) => t.label)).toEqual(labels);
    expect(timers.map((t) => t.seconds)).toEqual(seconds);
  });

  it('ignores amounts and implausibly short durations', () => {
    expect(findTimers('Use 2 tbsp of oil and 1 tsp salt.')).toEqual([]);
    expect(findTimers('Pulse for 2 seconds.')).toEqual([]);
  });
});

describe('formatClock', () => {
  it('formats minutes and hours', () => {
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('FlavorCraft originals', () => {
  it('have unique ids, steps, and fully profiled ingredients', () => {
    const ids = new Set(ORIGINAL_RECIPES.map((r) => r.id));
    expect(ids.size).toBe(ORIGINAL_RECIPES.length);
    for (const r of ORIGINAL_RECIPES) {
      expect(r.steps.length).toBeGreaterThan(0);
      const p = computeProfile(r.ingredients);
      // Every original should be mostly covered by the flavor table.
      expect(p.matched / p.total).toBeGreaterThanOrEqual(0.8);
    }
  });
});
