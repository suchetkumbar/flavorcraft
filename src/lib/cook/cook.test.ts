import { describe, expect, it } from 'vitest';
import type { TasteVector } from '../flavor/tastes';
import type { ProfiledRecipe } from '../recipes/types';
import { checkpointReason, findCheckpoints, MAX_CHECKPOINTS, personalHint } from './checkpoints';
import { balanceScore, companionsFor, cuisineAffinity, isSideDish } from './companions';
import { leftoverCandidates, listWords, leftoverIdeas } from './leftovers';
import { planTogether, roughDuration, stepEffort } from './together';
import { parseVoiceCommand } from './voice';

const fake = (id: string, vector: TasteVector, over: Partial<ProfiledRecipe> = {}): ProfiledRecipe => ({
  id, title: id, category: 'Beef', area: 'Unknown', tags: [], steps: ['Cook it.'], source: 'flavorcraft', ingredients: [],
  flavor: { vector, sources: vector.map(() => []), matched: 8, total: 8 },
  ...over,
});
const lines = (...names: string[]) => names.map((name) => ({ name, measure: '' }));

describe('taste checkpoints', () => {
  it('uses the moments the recipe itself asks for', () => {
    const steps = ['Brown the beef.', 'Add stock. Taste and adjust the seasoning.', 'Serve.'];
    expect(findCheckpoints(steps)).toEqual([{ step: 1, reason: 'asked' }]);
  });

  it('does not treat the noun "taste" as an instruction', () => {
    const steps = ['To enhance taste, use broth instead of water.', 'Fry the arepas.', 'Fill them.', 'Wrap.', 'Chill.'];
    expect(findCheckpoints(steps).some((c) => c.reason === 'asked')).toBe(false);
  });

  it('adds one after a long simmer, and a final one when nothing is near the end', () => {
    const steps = ['Soften the onion.', 'Add tomatoes and simmer for 30 minutes.', 'Stir in the beans.', 'Warm through.', 'Ladle into bowls.'];
    expect(findCheckpoints(steps)).toEqual([
      { step: 1, reason: 'reduced' },
      { step: 4, reason: 'final' },
    ]);
  });

  it('ignores a quick simmer', () => {
    expect(findCheckpoints(['Simmer for 2 minutes.', 'Serve.'])).toEqual([{ step: 1, reason: 'final' }]);
  });

  it('leaves baking alone unless the recipe says to taste', () => {
    const cake = ['Cream the butter and sugar.', 'Fold in flour.', 'Bake for 40 minutes.'];
    expect(findCheckpoints(cake, 'Dessert')).toEqual([]);
    expect(findCheckpoints(['Stir the custard. Taste and add more sugar if needed.', 'Chill.'], 'Dessert')).toHaveLength(1);
  });

  it('caps the number, keeping what the recipe asked for', () => {
    const steps = ['Simmer 20 minutes.', 'Simmer 20 minutes.', 'Simmer 20 minutes.', 'Season to taste.', 'Simmer 15 minutes.', 'Rest.', 'Carve.', 'Plate.'];
    const found = findCheckpoints(steps);
    expect(found).toHaveLength(MAX_CHECKPOINTS);
    expect(found.some((c) => c.reason === 'asked')).toBe(true);
    expect(found.map((c) => c.step)).toEqual([...found.map((c) => c.step)].sort((a, b) => a - b));
    expect(checkpointReason(found[0])).toBeTruthy();
  });

  it('turns the strongest lean of your seasoning hand into a hint', () => {
    expect(personalHint([])).toBeNull();
    expect(personalHint([{ taste: 1, lean: -0.25, evidence: 2 }, { taste: 2, lean: 0.75, evidence: 3 }])).toMatch(/more acid/);
    expect(personalHint([{ taste: 1, lean: -0.75, evidence: 3 }])).toMatch(/too salty/);
  });
});

describe('voice commands', () => {
  it('understands the short commands', () => {
    expect(parseVoiceCommand('Next.')).toBe('next');
    expect(parseVoiceCommand('next step')).toBe('next');
    expect(parseVoiceCommand('Go back')).toBe('back');
    expect(parseVoiceCommand('repeat that')).toBe('repeat');
    expect(parseVoiceCommand('Start the timer!')).toBe('timer');
    expect(parseVoiceCommand('stop listening')).toBe('stop');
  });

  it('ignores kitchen conversation that happens to contain a command word', () => {
    expect(parseVoiceCommand('what is next for the weekend')).toBeNull();
    expect(parseVoiceCommand('pass me the timer please')).toBeNull();
    expect(parseVoiceCommand('I will be back')).toBeNull();
    expect(parseVoiceCommand('next to the sink')).toBeNull();
    expect(parseVoiceCommand('')).toBeNull();
  });
});

describe('cooking two dishes', () => {
  it('separates hands-on time from waits', () => {
    expect(stepEffort('Simmer for 30 minutes.')).toEqual({ active: 180, wait: 1800 });
    // A short fry is hands-on; you don't walk away from it.
    expect(stepEffort('Fry for 3 minutes.')).toEqual({ active: 360, wait: 0 });
    // Long, but the recipe says to stay with it.
    expect(stepEffort('Cook for 20 minutes, stirring constantly.').wait).toBe(0);
  });

  const stew = ['Brown the meat.', 'Add stock and simmer for 60 minutes.', 'Season and serve.'];
  const salad = ['Chop the vegetables.', 'Toss with dressing.'];

  it('keeps each dish in its own order and uses every step once', () => {
    const plan = planTogether(stew, salad);
    for (const dish of [0, 1] as const) {
      const order = plan.items.flatMap((i) => (i.kind === 'step' && i.dish === dish ? [i.index] : []));
      expect(order).toEqual([dish === 0 ? stew : salad][0].map((_, i) => i));
    }
  });

  it('fits the quick dish into the long dish’s wait, so both finish together', () => {
    const plan = planTogether(stew, salad);
    const kinds = plan.items.map((i) => (i.kind === 'step' ? `${i.dish}${i.index}` : 'wait'));
    // Stew first; the salad is made while it simmers, not at the very start and not after serving.
    expect(kinds.slice(0, 2)).toEqual(['00', '01']);
    expect(kinds.indexOf('10')).toBeGreaterThan(kinds.indexOf('01'));
    expect(kinds.indexOf('11')).toBeLessThan(kinds.indexOf('02'));
    expect(kinds).toContain('wait');
    expect(Math.abs(plan.finish[0] - plan.finish[1])).toBeLessThan(15 * 60);
    // Far shorter than cooking one after the other.
    expect(plan.total).toBeLessThan(60 * 60 + 15 * 60);
  });

  it('alternates between two hands-on dishes so neither falls behind', () => {
    const quick = 'Chop.'; // 3 minutes of work
    const longer = Array.from({ length: 40 }, () => 'stir').join(' '); // 4 minutes of work
    const plan = planTogether([quick, quick, quick, quick], [longer, longer]);
    const order = plan.items.map((i) => (i.kind === 'step' ? i.dish : 'wait'));
    // Doing all of one dish and then the other would leave the first going cold.
    expect(order).toEqual([0, 0, 1, 0, 1, 0]);
    expect(Math.abs(plan.finish[0] - plan.finish[1])).toBeLessThanOrEqual(4 * 60);
  });

  it('gives the same plan whichever dish is named first', () => {
    const ab = planTogether(stew, salad);
    const ba = planTogether(salad, stew);
    expect(ba.total).toBe(ab.total);
    expect(ba.finish).toEqual([ab.finish[1], ab.finish[0]]);
  });

  it('handles an empty recipe and words durations roughly', () => {
    expect(planTogether(stew, []).items.filter((i) => i.kind === 'step')).toHaveLength(3);
    expect(roughDuration(80 * 60)).toBe('about 1 hr 20 min');
    expect(roughDuration(7 * 60)).toBe('about 7 min');
    expect(roughDuration(43 * 60)).toBe('about 45 min');
  });
});

describe('side dishes', () => {
  const rich: TasteVector = [2, 5, 0, 1, 6, 1, 8, 4];
  const sharpSalad: TasteVector = [2, 3, 7, 2, 1, 1, 2, 7];
  const creamyMash: TasteVector = [3, 4, 0, 0, 2, 0, 8, 2];

  it('prefers a sharp side for a rich main over more richness', () => {
    expect(balanceScore(rich, sharpSalad)).toBeGreaterThan(balanceScore(rich, creamyMash));
    const picks = companionsFor(fake('braise', rich), [
      fake('salad', sharpSalad, { category: 'Side' }),
      fake('mash', creamyMash, { category: 'Side' }),
    ]);
    expect(picks[0].recipe.id).toBe('salad');
    expect(picks[0].why).toMatch(/cuts through the richness/);
    expect(picks.some((p) => p.recipe.id === 'mash')).toBe(false); // adds nothing, so it isn't suggested
  });

  it('prefers something cool next to a hot main', () => {
    const hot: TasteVector = [2, 4, 4, 1, 5, 9, 3, 7];
    const raita: TasteVector = [1, 2, 5, 0, 1, 0, 5, 5];
    const hotPickle: TasteVector = [2, 5, 6, 1, 1, 7, 0, 6];
    expect(balanceScore(hot, raita)).toBeGreaterThan(balanceScore(hot, hotPickle));
  });

  it('favors the same or a neighboring cuisine, and fewer shared ingredients', () => {
    expect(cuisineAffinity('Turkish', 'Turkish')).toBe(2);
    expect(cuisineAffinity('Turkish', 'Tunisian')).toBe(1);
    expect(cuisineAffinity('Turkish', 'Japanese')).toBe(0);
    expect(cuisineAffinity('Unknown', 'Unknown')).toBe(0);
    const main = fake('stew', rich, { area: 'Turkish', ingredients: lines('Lamb', 'Tomato') });
    const picks = companionsFor(main, [
      fake('far', sharpSalad, { category: 'Side', area: 'Japanese', ingredients: lines('Cucumber', 'Vinegar') }),
      fake('near', sharpSalad, { category: 'Side', area: 'Turkish', ingredients: lines('Cucumber', 'Yogurt') }),
      fake('same-stuff', sharpSalad, { category: 'Side', area: 'Turkish', ingredients: lines('Tomato', 'Lamb') }),
    ]);
    expect(picks.map((p) => p.recipe.id)).toEqual(['near', 'far', 'same-stuff']);
  });

  it('leaves out soups, plain bread and sweet bakes, and suggests nothing for a dessert', () => {
    expect(isSideDish(fake('Creamy Tomato Soup', sharpSalad, { category: 'Starter' }))).toBe(false);
    expect(isSideDish(fake('Rye bread', [5, 4, 1, 1, 1, 0, 0, 5], { category: 'Side' }))).toBe(false);
    expect(isSideDish(fake('Sweet loaf', [9, 3, 1, 1, 2, 0, 8, 3], { category: 'Side' }))).toBe(false);
    expect(isSideDish(fake('Cucumber salad', sharpSalad, { category: 'Side' }))).toBe(true);
    const sides = [fake('salad', sharpSalad, { category: 'Side' })];
    expect(companionsFor(fake('cake', rich, { category: 'Dessert' }), sides)).toEqual([]);
  });
});

describe('using up leftovers', () => {
  const curry = fake('curry', [2, 4, 3, 1, 5, 7, 6, 7], {
    ingredients: lines('Chicken', 'Coconut Milk', 'Fresh Coriander', 'Ground Coriander', 'Salt', 'Lime'),
  });

  it('picks the perishable ingredients, not dried spices or staples', () => {
    expect(leftoverCandidates(curry)).toEqual(['coconut milk', 'coriander', 'lime']);
    expect(leftoverCandidates({ ingredients: lines('Ground Coriander', 'Chilli Powder', 'Rice') })).toEqual([]);
  });

  it('ranks by how many leftovers a recipe uses, then by how different it tastes', () => {
    const soup = fake('soup', [2, 4, 3, 1, 5, 6, 6, 7], { ingredients: lines('Coconut Milk', 'Prawns') });
    const salsa = fake('salsa', [5, 2, 7, 1, 1, 2, 0, 8], { ingredients: lines('Coriander', 'Lime', 'Tomato') });
    const dessert = fake('rice-pudding', [9, 1, 0, 0, 0, 0, 7, 3], { ingredients: lines('Coconut Milk', 'Rice') });
    const unrelated = fake('toast', [1, 3, 0, 0, 1, 0, 2, 1], { ingredients: lines('Bread') });
    const ideas = leftoverIdeas(curry, ['coconut milk', 'coriander', 'lime'], [curry, soup, salsa, dessert, unrelated]);
    expect(ideas.map((i) => i.recipe.id)).toEqual(['salsa', 'rice-pudding', 'soup']);
    expect(ideas[0].uses).toEqual(['coriander', 'lime']);
    expect(ideas[1].change).toBeGreaterThan(ideas[2].change);
  });

  it('does not count ground coriander as using up fresh coriander', () => {
    const rub = fake('rub', [1, 5, 0, 1, 3, 4, 2, 8], { ingredients: lines('Ground Coriander', 'Beef') });
    expect(leftoverIdeas(curry, ['coriander'], [rub])).toEqual([]);
  });

  it('returns nothing without leftovers, and joins words naturally', () => {
    expect(leftoverIdeas(curry, [], [curry])).toEqual([]);
    expect(listWords(['lime'])).toBe('lime');
    expect(listWords(['lime', 'mint'])).toBe('lime and mint');
    expect(listWords(['lime', 'mint', 'yogurt'])).toBe('lime, mint and yogurt');
  });
});
