import { afterEach, describe, expect, it } from 'vitest';
import { computeProfile } from '../flavor/profile';
import type { TasteVector } from '../flavor/tastes';
import type { Remix } from '../kitchen/types';
import type { ProfiledRecipe, Recipe } from '../recipes/types';
import { BRIEFS, challengeFor, judge, previousWeek, rankEntries, timeLeft, weekKey } from './challenges';
import { applyCrowdCorrections, correctionsFor, loadCrowdSignals, MAX_CORRECTION, tuneFromCrowd, type CrowdSignal } from './crowd';
import { buildFamily, changeWords, familySize, ROOT_ID, tasteChanges } from './tree';
import { favoritesFrom, handleProblem, profileIsStale, rankTwins, sharedTastes, suggestHandle, tasteMatch, type PublicProfile } from './twins';

const lines = (...names: string[]) => names.map((name) => ({ name, measure: '' }));

const recipe = (id: string, names: string[], over: Partial<Recipe> = {}): ProfiledRecipe => {
  const ingredients = lines(...names);
  return {
    id, title: id, category: 'Chicken', area: 'Unknown', tags: [], steps: ['Cook it.'], source: 'flavorcraft', ingredients,
    flavor: computeProfile(ingredients),
    ...over,
  };
};

const remix = (id: string, parentRemixId: string | null, names: string[], createdAt = id): Remix => ({
  id, parentRecipeId: 'r', parentRemixId, title: id, note: '', ingredients: lines(...names), removed: [], added: [], isPublic: true, createdAt,
});

describe('remix family tree', () => {
  const base = ['chicken', 'cream', 'onion'];
  const rootVector = computeProfile(lines(...base)).vector;

  it('puts each fork one column right of its parent and centers parents on their forks', () => {
    const nodes = buildFamily('Original', rootVector, [
      remix('a', null, [...base, 'lemon']),
      remix('b', null, [...base, 'ginger']),
      remix('a1', 'a', [...base, 'lemon', 'mint']),
      remix('a2', 'a', [...base, 'lemon', 'sugar']),
    ]);
    const at = (id: string) => nodes.find((n) => n.id === id)!;
    expect(at(ROOT_ID).depth).toBe(0);
    expect([at('a').depth, at('b').depth, at('a1').depth]).toEqual([1, 1, 2]);
    expect([at('a1').row, at('a2').row, at('b').row]).toEqual([0, 1, 2]);
    expect(at('a').row).toBe(0.5);
    expect(at(ROOT_ID).row).toBe(1.25);
    expect(familySize(nodes)).toEqual({ columns: 3, rows: 3 });
  });

  it('describes each fork by how it changed the taste of its parent, not of the original', () => {
    const nodes = buildFamily('Original', rootVector, [remix('a', null, [...base, 'lemon']), remix('a1', 'a', [...base, 'lemon', 'ginger'])]);
    const a = nodes.find((n) => n.id === 'a')!;
    const a1 = nodes.find((n) => n.id === 'a1')!;
    expect(a.changes[0]).toMatchObject({ taste: 2 }); // sour
    expect(a.changes[0].delta).toBeGreaterThan(0);
    expect(a1.changes.some((c) => c.taste === 2)).toBe(false); // lemon was already there
    expect(a1.changes[0]).toMatchObject({ taste: 5 }); // heat
    expect(changeWords(a.changes, 1)).toBe('More sour');
  });

  it('hangs a fork off the original when its parent is private or deleted', () => {
    const nodes = buildFamily('Original', rootVector, [remix('orphan', 'someone-elses-private-remix', base)]);
    expect(nodes[1]).toMatchObject({ id: 'orphan', parentId: ROOT_ID, depth: 1, detached: true });
  });

  it('survives remixes that point at each other', () => {
    const nodes = buildFamily('Original', rootVector, [remix('x', 'y', base), remix('y', 'x', base), remix('z', 'z', base)]);
    expect(nodes.map((n) => n.id).sort()).toEqual([ROOT_ID, 'x', 'y', 'z'].sort());
    expect(new Set(nodes.map((n) => n.row)).size).toBeGreaterThan(1);
  });

  it('ignores changes too small to taste', () => {
    expect(tasteChanges([5, 5, 5, 5, 5, 5, 5, 5], [5.3, 5, 5, 5, 5, 5, 3, 5])).toEqual([{ taste: 6, delta: -2 }]);
    expect(changeWords([])).toBe('Tastes about the same');
    expect(changeWords([{ taste: 2, delta: 2 }, { taste: 6, delta: -1 }])).toBe('More sour, lighter');
  });
});

describe('weekly challenge', () => {
  it('names ISO weeks, including the ones that cross a year', () => {
    expect(weekKey(new Date('2026-11-16T10:00:00Z'))).toBe('2026-W47');
    expect(weekKey(new Date('2026-11-22T23:59:00Z'))).toBe('2026-W47');
    expect(weekKey(new Date('2026-11-23T00:00:00Z'))).toBe('2026-W48');
    expect(weekKey(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
    expect(weekKey(new Date('2024-12-30T12:00:00Z'))).toBe('2025-W01');
  });

  const catalog = [
    recipe('creamy-chicken', ['chicken', 'cream', 'butter', 'onion', 'rice', 'mushroom']),
    recipe('buttery-rice', ['rice', 'butter', 'cream', 'chicken', 'onion', 'parmesan']),
    recipe('soy-noodles', ['soy sauce', 'noodle', 'chicken', 'bacon', 'onion', 'miso']),
    recipe('sweet-cake', ['sugar', 'flour', 'butter', 'cream', 'egg', 'honey'], { category: 'Dessert' }),
  ];

  it('gives everyone the same challenge all week and a different key the next', () => {
    const mon = challengeFor(new Date('2026-11-16T00:00:00Z'), catalog)!;
    const sun = challengeFor(new Date('2026-11-22T23:00:00Z'), [...catalog].reverse())!;
    expect(sun.key).toBe(mon.key);
    expect(sun.brief.id).toBe(mon.brief.id);
    expect(sun.recipe.id).toBe(mon.recipe.id);
    expect(mon.endsAt.toISOString()).toBe('2026-11-23T00:00:00.000Z');
    expect(challengeFor(new Date('2026-11-23T00:00:00Z'), catalog)!.key).not.toBe(mon.key);
    expect(weekKey(previousWeek(new Date('2026-11-18T00:00:00Z')))).toBe('2026-W46');
  });

  it('rotates through the prompts and only starts from a recipe that suits the prompt', () => {
    const seen = new Set<string>();
    for (let w = 0; w < BRIEFS.length * 2; w++) {
      const c = challengeFor(new Date(Date.UTC(2026, 10, 16 + w * 7)), catalog)!;
      expect(c.brief.suits(c.recipe)).toBe(true);
      seen.add(c.brief.id);
    }
    expect(seen.size).toBeGreaterThan(2);
    expect(challengeFor(new Date(), [])).toBeNull();
  });

  const bright = BRIEFS.find((b) => b.id === 'bright-no-citrus')!;
  const start = catalog[0];

  it('passes a remix that reaches the goal within the rules', () => {
    const verdict = judge(bright, start, [...start.ingredients, ...lines('vinegar')]);
    expect(verdict.met).toBe(true);
    expect(verdict.checks.map((c) => c.ok)).toEqual([true, true]);
  });

  it('fails a remix that reaches the goal with a banned ingredient, and says which', () => {
    const verdict = judge(bright, start, [...start.ingredients, ...lines('Lime juice')]);
    expect(verdict.met).toBe(false);
    expect(verdict.checks[0].ok).toBe(true);
    expect(verdict.checks[1]).toMatchObject({ ok: false, detail: 'Uses lime juice' });
  });

  it('fails an unchanged recipe', () => {
    for (const brief of BRIEFS) expect(judge(brief, start, start.ingredients).met).toBe(false);
  });

  it('checks tastes that must be kept and limits on new ingredients', () => {
    const lighter = BRIEFS.find((b) => b.id === 'lighter-still-savory')!;
    const without = (names: string[]) => start.ingredients.filter((i) => !names.includes(i.name));
    // Dropping the cream and butter makes it lighter; dropping the mushroom and chicken too loses the depth.
    expect(judge(lighter, start, without(['cream', 'butter'])).met).toBe(true);
    const hollow = judge(lighter, start, without(['cream', 'butter', 'mushroom', 'chicken']));
    expect(hollow.checks.map((c) => c.ok)).toEqual([true, false]);

    const fresher = BRIEFS.find((b) => b.id === 'fresher-in-two')!;
    const plain = recipe('plain', ['rice', 'chicken', 'butter', 'cream', 'potato']);
    expect(judge(fresher, plain, [...plain.ingredients, ...lines('mint', 'basil')]).met).toBe(true);
    const three = judge(fresher, plain, [...plain.ingredients, ...lines('mint', 'basil', 'ginger')]);
    expect(three.checks.at(-1)).toMatchObject({ ok: false, detail: '3 added' });
  });

  it('ranks entries that meet the brief above ones with more votes that do not', () => {
    const e = (id: string, voteCount: number, met: boolean, createdAt = '1') => ({ entry: { id, voteCount, createdAt }, verdict: { met, checks: [] } });
    const ranked = rankEntries([e('popular-miss', 9, false), e('late', 2, true, '2'), e('early', 2, true, '1'), e('best', 5, true)]);
    expect(ranked.map((r) => r.entry.id)).toEqual(['best', 'early', 'late', 'popular-miss']);
  });

  it('counts down in days', () => {
    const end = new Date('2026-11-23T00:00:00Z');
    expect(timeLeft(end, new Date('2026-11-16T09:00:00Z'))).toBe('7 days left');
    expect(timeLeft(end, new Date('2026-11-22T09:00:00Z'))).toBe('Ends today');
  });
});

describe('taste twins', () => {
  const average: TasteVector = [3, 3, 3, 1, 4, 2, 4, 4];
  const me: TasteVector = [3, 3, 5, 1, 4, 4.5, 4, 4];
  const person = (handle: string, taste: TasteVector): PublicProfile => ({
    userId: handle, handle, displayName: handle, taste, favorites: [], updatedAt: '',
  });

  it('scores an identical palate 100 and falls off quickly with distance', () => {
    expect(tasteMatch(me, me)).toBe(100);
    const near = tasteMatch(me, [3, 3, 4.5, 1, 4, 4, 4, 4]);
    const far = tasteMatch(me, [6, 3, 1, 1, 4, 0, 7, 4]);
    expect(near).toBeGreaterThan(90);
    expect(far).toBeLessThan(25);
  });

  it('ranks the closest palates first and never lists you', () => {
    const twins = rankTwins(
      me,
      [person('sweet_tooth', [7, 2, 1, 1, 3, 0, 7, 3]), person('me', me), person('hot_and_sour', [3, 3, 5.5, 1, 4, 5, 3.5, 4])],
      average,
      'me',
    );
    expect(twins.map((t) => t.profile.handle)).toEqual(['hot_and_sour', 'sweet_tooth']);
    expect(twins[0].shared).toBe('You both like more heat and sourness than most');
  });

  it('says what two cooks avoid when they share no strong likes', () => {
    expect(sharedTastes([1, 3, 3, 1, 4, 2, 2.5, 4], [1.5, 3, 3, 1, 4, 2, 4, 4], average)).toBe('You both go easy on sweetness');
    expect(sharedTastes(average, average, average)).toBe('Your overall balance is close');
  });

  it('publishes liked dishes first, then saved ones, without repeats', () => {
    const cook = (recipeId: string, rating: number | null, cookedAt: string) => ({ id: recipeId + cookedAt, recipeId, remixId: null, cookedAt, rating, problems: [], note: '' });
    expect(
      favoritesFrom({
        cooks: [cook('ok', 3, '5'), cook('loved', 5, '1'), cook('liked', 4, '2'), cook('loved', 5, '3'), cook('unrated', null, '4')],
        saved: [{ recipeId: 'liked', savedAt: '1' }, { recipeId: 'saved', savedAt: '2' }],
      }),
    ).toEqual(['loved', 'liked', 'saved']);
  });

  it('suggests and validates handles the way the database does', () => {
    expect(suggestHandle('Asha K.')).toBe('asha_k');
    expect(handleProblem('asha_k')).toBeNull();
    expect(handleProblem('ab')).toMatch(/at least 3/);
    expect(handleProblem('Asha')).toMatch(/lowercase/);
    expect(handleProblem('a'.repeat(25))).toMatch(/24/);
  });

  it('knows when a published profile has fallen behind the kitchen', () => {
    const published = { ...person('me', me), favorites: ['a'] };
    expect(profileIsStale(published, me, ['a'])).toBe(false);
    expect(profileIsStale(published, me, ['a', 'b'])).toBe(true);
    expect(profileIsStale(published, [3, 3, 5, 1, 4, 5, 4, 4], ['a'])).toBe(true);
  });
});

describe('crowd-tuned flavor table', () => {
  afterEach(() => applyCrowdCorrections([]));

  const recipes = [
    recipe('soy-chicken', ['soy sauce', 'chicken', 'onion', 'rice']),
    recipe('soy-noodles', ['soy sauce', 'noodle', 'onion', 'ginger']),
    recipe('roast-chicken', ['chicken', 'onion', 'butter', 'salt']),
    recipe('buttered-rice', ['rice', 'butter', 'onion', 'salt']),
  ];
  const signal = (recipeId: string, cooks: number, salty: number): CrowdSignal[] => [
    { recipeId, cooks, problem: null, reports: 0 },
    ...(salty ? [{ recipeId, cooks, problem: 'too-salty' as const, reports: salty }] : []),
  ];
  const SALTY = 1;

  it('raises the score of the ingredient whose dishes keep being called too salty', () => {
    const corrections = tuneFromCrowd(
      [...signal('soy-chicken', 10, 7), ...signal('soy-noodles', 8, 6), ...signal('roast-chicken', 10, 1), ...signal('buttered-rice', 10, 0)],
      recipes,
    );
    const soy = corrections.find((c) => c.key === 'soy sauce' && c.taste === SALTY)!;
    expect(soy).toMatchObject({ cooks: 18, recipes: 2 });
    expect(soy.delta).toBeGreaterThan(0.5);
    expect(soy.delta).toBeLessThanOrEqual(MAX_CORRECTION);
    // Salt itself is in the dishes nobody complained about, so it's left alone.
    expect(corrections.some((c) => c.key === 'salt')).toBe(false);
  });

  it('never blames an ingredient that does not carry the taste', () => {
    // Ginger rides along with soy sauce in both dishes people found too salty, and nowhere else.
    const together = [
      recipe('soy-ginger-rice', ['soy sauce', 'ginger', 'rice']),
      recipe('soy-ginger-noodles', ['soy sauce', 'ginger', 'noodle']),
      recipe('plain-chicken', ['chicken', 'onion', 'butter']),
    ];
    const corrections = tuneFromCrowd(
      [...signal('soy-ginger-rice', 10, 9), ...signal('soy-ginger-noodles', 10, 9), ...signal('plain-chicken', 10, 0)],
      together,
    );
    expect(corrections.map((c) => c.key)).toEqual(['soy sauce']);
  });

  it('changes nothing when every dish gets the same complaint', () => {
    const everywhere = recipes.flatMap((r) => signal(r.id, 10, 6));
    expect(tuneFromCrowd(everywhere, recipes)).toEqual([]);
  });

  it('waits for enough cooks across enough recipes', () => {
    expect(tuneFromCrowd([...signal('soy-chicken', 3, 3), ...signal('soy-noodles', 3, 3), ...signal('roast-chicken', 10, 0)], recipes)).toEqual([]);
    // Plenty of cooks, but only one recipe with soy: could be the recipe, not the ingredient.
    expect(tuneFromCrowd([...signal('soy-chicken', 30, 25), ...signal('roast-chicken', 10, 0), ...signal('buttered-rice', 10, 0)], recipes)
      .some((c) => c.key === 'soy sauce')).toBe(false);
    expect(tuneFromCrowd([], recipes)).toEqual([]);
  });

  it('ignores problems that do not point at one taste, and recipes it does not know', () => {
    const flat: CrowdSignal[] = recipes.slice(0, 2).flatMap((r) => [
      { recipeId: r.id, cooks: 10, problem: null, reports: 0 },
      { recipeId: r.id, cooks: 10, problem: 'flat' as const, reports: 9 },
    ]);
    expect(tuneFromCrowd([...flat, ...signal('not-in-catalog', 50, 50)], recipes)).toEqual([]);
  });

  it('changes computed profiles once applied, and can be undone', () => {
    const dish = lines('bacon', 'rice');
    const before = computeProfile(dish).vector[SALTY];
    applyCrowdCorrections([{ key: 'bacon', taste: SALTY, delta: 1.5, cooks: 20, recipes: 3 }]);
    expect(computeProfile(dish).vector[SALTY]).toBeGreaterThan(before);
    expect(correctionsFor('bacon')).toHaveLength(1);
    expect(correctionsFor('rice')).toHaveLength(0);
    applyCrowdCorrections([]);
    expect(computeProfile(dish).vector[SALTY]).toBe(before);
  });

  it('tunes from the hand-made table, so applying corrections does not feed back into them', () => {
    const signals = [...signal('soy-chicken', 10, 7), ...signal('soy-noodles', 8, 6), ...signal('roast-chicken', 10, 1), ...signal('buttered-rice', 10, 0)];
    const first = tuneFromCrowd(signals, recipes);
    applyCrowdCorrections(first);
    expect(tuneFromCrowd(signals, recipes)).toEqual(first);
  });

  it('loads signals without ever throwing, and caches a good answer', async () => {
    localStorage.clear();
    expect(await loadCrowdSignals(() => Promise.reject(new Error('down')))).toEqual([]);
    expect(await loadCrowdSignals(() => new Promise(() => {}), 10)).toEqual([]);
    const good = signal('soy-chicken', 10, 7);
    expect(await loadCrowdSignals(() => Promise.resolve(good))).toEqual(good);
    // Served from the cache: the fetcher isn't called again.
    expect(await loadCrowdSignals(() => Promise.reject(new Error('should not be called')))).toEqual(good);
    localStorage.clear();
  });
});
