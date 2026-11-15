import { TASTE_KEYS, clampVector, type TasteKey, type TasteVector } from './tastes';

export type DishProblem =
  | 'too-salty'
  | 'too-sweet'
  | 'too-sour'
  | 'too-bitter'
  | 'too-spicy'
  | 'too-heavy'
  | 'flat'
  | 'no-depth';

export const PROBLEMS: { id: DishProblem; label: string }[] = [
  { id: 'flat', label: 'It tastes flat' },
  { id: 'no-depth', label: 'It lacks depth' },
  { id: 'too-salty', label: 'Too salty' },
  { id: 'too-sweet', label: 'Too sweet' },
  { id: 'too-sour', label: 'Too sour' },
  { id: 'too-bitter', label: 'Too bitter' },
  { id: 'too-spicy', label: 'Too spicy' },
  { id: 'too-heavy', label: 'Too heavy' },
];

export interface Fix {
  action: string;
  examples: string;
  amount: string;
  why: string;
  /** Expected change to the profile, used to preview the result. */
  effect: Partial<Record<TasteKey, number>>;
}

const FIXES: Record<DishProblem, Fix[]> = {
  flat: [
    {
      action: 'Add salt',
      examples: 'fine salt, soy sauce, fish sauce',
      amount: 'A pinch at a time, tasting between each',
      why: 'Salt makes every other flavor louder. Most flat food is under-salted.',
      effect: { salty: 2.5, umami: 0.5 },
    },
    {
      action: 'Add acid',
      examples: 'lemon juice, lime, a splash of vinegar',
      amount: '1 tsp per 4 servings, then taste',
      why: 'Acid brightens a dish and keeps rich flavors from blurring together.',
      effect: { sour: 2.5, aroma: 0.5 },
    },
    {
      action: 'Finish with something fresh',
      examples: 'chopped herbs, citrus zest, spring onion',
      amount: 'A handful, stirred in just before serving',
      why: 'Aromas fade with cooking. Adding them at the end puts them back.',
      effect: { aroma: 3 },
    },
  ],
  'no-depth': [
    {
      action: 'Add umami',
      examples: 'tomato paste, miso, parmesan, anchovy, mushrooms',
      amount: '1 tbsp paste or a few anchovies, cooked in',
      why: 'Umami gives a savory backbone that makes food taste finished.',
      effect: { umami: 3, salty: 1 },
    },
    {
      action: 'Brown something',
      examples: 'sear meat hard, caramelize onions, toast spices',
      amount: 'Take it further than feels comfortable',
      why: 'Browning creates hundreds of new flavor compounds.',
      effect: { umami: 1.5, aroma: 1.5, sweet: 0.5, bitter: 0.5 },
    },
    {
      action: 'Add a little bitterness',
      examples: 'a square of dark chocolate, coffee, charred greens',
      amount: 'Small. You should not be able to name it',
      why: 'A trace of bitterness reads as complexity, especially in stews and chilli.',
      effect: { bitter: 1.5 },
    },
  ],
  'too-salty': [
    {
      action: 'Add acid',
      examples: 'lemon juice, vinegar',
      amount: '1 tsp at a time',
      why: 'Acid competes with salt for attention, so the dish reads less salty.',
      effect: { sour: 2.5, salty: -1.5 },
    },
    {
      action: 'Add fat or dairy',
      examples: 'butter, cream, yogurt, olive oil',
      amount: '1–2 tbsp',
      why: 'Fat coats the tongue and softens how sharply salt lands.',
      effect: { rich: 2.5, salty: -1.5 },
    },
    {
      action: 'Make more of the unsalted base',
      examples: 'more vegetables, beans, unsalted stock, rice',
      amount: 'Increase the batch by a third',
      why: 'The only fix that actually removes salt per bite is dilution.',
      effect: { salty: -3 },
    },
  ],
  'too-sweet': [
    {
      action: 'Add acid',
      examples: 'lemon, lime, vinegar, sour cream',
      amount: '1 tsp at a time',
      why: 'Sourness balances sugar directly. This is why lemonade works.',
      effect: { sour: 3, sweet: -2 },
    },
    {
      action: 'Add a pinch of salt',
      examples: 'flaky salt, soy sauce in savory dishes',
      amount: 'A small pinch',
      why: 'Salt pulls sweetness back toward savory.',
      effect: { salty: 1.5, sweet: -1 },
    },
    {
      action: 'Add bitterness or heat',
      examples: 'cocoa, coffee, chilli, black pepper',
      amount: 'A little',
      why: 'Bitterness and heat cut through sugar and give it an edge.',
      effect: { bitter: 1.5, heat: 1.5, sweet: -1 },
    },
  ],
  'too-sour': [
    {
      action: 'Add fat',
      examples: 'butter, cream, coconut milk, olive oil',
      amount: '1–2 tbsp',
      why: 'Fat rounds off sharp acidity.',
      effect: { rich: 2.5, sour: -2 },
    },
    {
      action: 'Add a little sweetness',
      examples: 'honey, sugar, sweet onions, carrots',
      amount: '½ tsp at a time',
      why: 'Sweetness and sourness balance each other.',
      effect: { sweet: 2, sour: -2 },
    },
    {
      action: 'For tomato sauces, a tiny pinch of baking soda',
      examples: 'bicarbonate of soda',
      amount: 'No more than ⅛ tsp per pot',
      why: 'It neutralizes acid chemically. Too much tastes soapy.',
      effect: { sour: -3 },
    },
  ],
  'too-bitter': [
    {
      action: 'Add salt',
      examples: 'fine salt, parmesan, soy sauce',
      amount: 'A pinch',
      why: 'Salt suppresses bitterness better than sugar does.',
      effect: { salty: 2, bitter: -2.5 },
    },
    {
      action: 'Add sweetness',
      examples: 'honey, balsamic, caramelized onion',
      amount: '½ tsp at a time',
      why: 'Sweetness masks bitter notes.',
      effect: { sweet: 2, bitter: -1.5 },
    },
    {
      action: 'Add fat',
      examples: 'olive oil, butter, cream, cheese',
      amount: '1 tbsp',
      why: 'Fat softens bitterness and gives it something to lean on.',
      effect: { rich: 2, bitter: -1.5 },
    },
  ],
  'too-spicy': [
    {
      action: 'Add dairy or coconut',
      examples: 'yogurt, cream, coconut milk, sour cream',
      amount: 'A few spoonfuls, or serve it on the side',
      why: 'Capsaicin dissolves in fat, so dairy carries the burn away.',
      effect: { rich: 3, heat: -3 },
    },
    {
      action: 'Add sweetness and acid',
      examples: 'sugar with lime, honey with vinegar',
      amount: '½ tsp of each',
      why: 'Together they distract the palate from heat.',
      effect: { sweet: 1.5, sour: 1.5, heat: -1.5 },
    },
    {
      action: 'Bulk it out',
      examples: 'more rice, potatoes, beans, unspiced base',
      amount: 'Increase the batch by a third',
      why: 'Dilution lowers heat per bite.',
      effect: { heat: -2.5 },
    },
  ],
  'too-heavy': [
    {
      action: 'Add acid',
      examples: 'lemon juice, vinegar, pickled onions',
      amount: '1–2 tsp',
      why: 'Acid cuts through fat and makes a rich dish feel lighter.',
      effect: { sour: 3, rich: -1 },
    },
    {
      action: 'Add something bitter or peppery',
      examples: 'rocket, radicchio, black pepper',
      amount: 'A handful on top or on the side',
      why: 'Bitter greens reset the palate between rich bites.',
      effect: { bitter: 2, heat: 1, rich: -1 },
    },
    {
      action: 'Finish with fresh herbs',
      examples: 'parsley, mint, dill, coriander',
      amount: 'A big handful',
      why: 'Fresh aroma gives contrast to dense, fatty flavors.',
      effect: { aroma: 3 },
    },
  ],
};

export interface RankedFix extends Fix {
  /** Short note tying the suggestion to this recipe's profile. */
  note?: string;
}

/**
 * Returns fixes for a problem, reordered for this specific dish. For example,
 * if a "flat" dish already has plenty of salt, acid moves to the top.
 */
export const fixesFor = (problem: DishProblem, current: TasteVector): RankedFix[] => {
  const at = (k: TasteKey) => current[TASTE_KEYS.indexOf(k)];
  return FIXES[problem]
    .map((fix) => {
      const boosted = Object.entries(fix.effect).filter(([, d]) => (d ?? 0) > 0) as [TasteKey, number][];
      // Prefer fixes that add what the dish is missing.
      const headroom = boosted.reduce((sum, [k]) => sum + (10 - at(k)), 0) / Math.max(1, boosted.length);
      const main = boosted[0]?.[0];
      let note: string | undefined;
      if (main && at(main) >= 6) note = `This dish is already high in ${main}, so go gently.`;
      else if (main && at(main) <= 2) note = `This dish has almost no ${main}, so this is the likely gap.`;
      return { ...fix, note, headroom };
    })
    .sort((a, b) => b.headroom - a.headroom)
    .map(({ headroom: _headroom, ...fix }) => fix);
};

export const applyEffect = (current: TasteVector, effect: Fix['effect']): TasteVector =>
  clampVector(current.map((v, i) => v + (effect[TASTE_KEYS[i]] ?? 0)));
