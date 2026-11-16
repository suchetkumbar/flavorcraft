import type { TasteVector } from './tastes';

export interface Drink {
  name: string;
  /** A few words on what it is, for cooks who don't know the name. */
  style: string;
  alcohol: boolean;
  /** Same eight tastes as a dish: sweet, salty, sour, bitter, umami, heat, rich, aroma. */
  vector: TasteVector;
  /** 1 light, 2 medium, 3 full. A drink should be about as weighty as the food. */
  body: 1 | 2 | 3;
  fizzy?: boolean;
  /** Strong or tannic drinks make chilli burn more. */
  harshWithHeat?: boolean;
}

// Hand-tuned like the ingredient table: culinary estimates, not measurements.
export const DRINKS: Drink[] = [
  { name: 'Dry Riesling', style: 'crisp white wine', alcohol: true, vector: [3, 0, 7, 0, 0, 0, 0, 6], body: 1 },
  { name: 'Off-dry Riesling', style: 'lightly sweet white wine', alcohol: true, vector: [6, 0, 6, 0, 0, 0, 1, 6], body: 1 },
  { name: 'Sauvignon Blanc', style: 'sharp, grassy white wine', alcohol: true, vector: [1, 0, 8, 1, 0, 0, 0, 7], body: 1 },
  { name: 'Oaked Chardonnay', style: 'full, buttery white wine', alcohol: true, vector: [2, 0, 4, 1, 0, 0, 6, 4], body: 3 },
  { name: 'Dry rosé', style: 'pale, crisp pink wine', alcohol: true, vector: [2, 0, 6, 0, 0, 0, 1, 5], body: 1 },
  { name: 'Pinot Noir', style: 'light, fruity red wine', alcohol: true, vector: [2, 0, 5, 2, 2, 0, 2, 6], body: 2 },
  { name: 'Chianti', style: 'sharp, savory Italian red', alcohol: true, vector: [1, 0, 6, 4, 3, 0, 2, 5], body: 2, harshWithHeat: true },
  { name: 'Cabernet Sauvignon', style: 'dark, tannic red wine', alcohol: true, vector: [1, 0, 4, 6, 3, 0, 4, 5], body: 3, harshWithHeat: true },
  { name: 'Dry sparkling wine', style: 'Cava, Crémant or Champagne', alcohol: true, vector: [1, 0, 7, 1, 1, 0, 0, 4], body: 1, fizzy: true },
  { name: 'Fino sherry', style: 'bone-dry, salty, nutty', alcohol: true, vector: [0, 2, 5, 2, 4, 0, 1, 5], body: 2 },
  { name: 'Lager', style: 'cold, crisp, lightly bitter beer', alcohol: true, vector: [1, 0, 2, 3, 0, 0, 0, 2], body: 1, fizzy: true },
  { name: 'Wheat beer', style: 'soft, cloudy, citrusy beer', alcohol: true, vector: [3, 0, 3, 1, 0, 0, 2, 5], body: 2, fizzy: true },
  { name: 'India pale ale', style: 'hoppy, bitter beer', alcohol: true, vector: [2, 0, 2, 8, 0, 0, 1, 7], body: 2, fizzy: true, harshWithHeat: true },
  { name: 'Stout', style: 'dark, roasted, creamy beer', alcohol: true, vector: [3, 0, 1, 6, 2, 0, 5, 4], body: 3 },
  { name: 'Dry cider', style: 'sharp apple cider', alcohol: true, vector: [3, 0, 6, 1, 0, 0, 0, 4], body: 1, fizzy: true },
  { name: 'Sake', style: 'smooth, savory rice wine', alcohol: true, vector: [3, 0, 2, 0, 5, 0, 2, 4], body: 2 },
  { name: 'Margarita', style: 'tequila, lime and salt', alcohol: true, vector: [3, 2, 8, 1, 0, 0, 0, 5], body: 2, harshWithHeat: true },
  { name: 'Sweet dessert wine', style: 'Sauternes, Tokaji or late-harvest', alcohol: true, vector: [9, 0, 5, 0, 0, 0, 3, 6], body: 3 },

  { name: 'Sparkling water with lemon', style: 'cold and sharp', alcohol: false, vector: [0, 0, 5, 0, 0, 0, 0, 3], body: 1, fizzy: true },
  { name: 'Mango lassi', style: 'sweet yogurt drink', alcohol: false, vector: [7, 0, 4, 0, 0, 0, 6, 4], body: 3 },
  { name: 'Salted lassi', style: 'thin, salty yogurt drink', alcohol: false, vector: [1, 3, 5, 0, 0, 0, 4, 2], body: 2 },
  { name: 'Ginger beer', style: 'sweet, fiery and fizzy', alcohol: false, vector: [6, 0, 3, 0, 0, 5, 0, 6], body: 2, fizzy: true },
  { name: 'Lemonade', style: 'cloudy, sweet and sharp', alcohol: false, vector: [6, 0, 8, 0, 0, 0, 0, 4], body: 1 },
  { name: 'Iced green tea', style: 'unsweetened, grassy', alcohol: false, vector: [0, 0, 1, 4, 2, 0, 0, 5], body: 1 },
  { name: 'Black tea', style: 'hot, strong, a little tannic', alcohol: false, vector: [0, 0, 1, 5, 1, 0, 0, 4], body: 2 },
  { name: 'Mint tea', style: 'hot, sweet, very fragrant', alcohol: false, vector: [4, 0, 0, 2, 0, 0, 0, 8], body: 1 },
  { name: 'Espresso', style: 'short, bitter coffee', alcohol: false, vector: [0, 0, 2, 9, 1, 0, 2, 7], body: 3 },
  { name: 'Kombucha', style: 'sour, lightly fizzy fermented tea', alcohol: false, vector: [3, 0, 7, 1, 1, 0, 0, 4], body: 1, fizzy: true },
  { name: 'Tomato juice', style: 'savory, with a squeeze of lemon', alcohol: false, vector: [3, 3, 4, 0, 6, 1, 1, 2], body: 2 },
  { name: 'Hibiscus iced tea', style: 'tart, deep red, lightly sweet', alcohol: false, vector: [4, 0, 7, 1, 0, 0, 0, 6], body: 1 },
  { name: 'Cold milk', style: 'plain and cooling', alcohol: false, vector: [3, 0, 0, 0, 0, 0, 5, 0], body: 2 },
];

const [SWEET, SALTY, SOUR, BITTER, UMAMI, HEAT, RICH, AROMA] = [0, 1, 2, 3, 4, 5, 6, 7];

/** How weighty a dish feels, on the same 1–3 scale as a drink's body. */
export const dishWeight = (v: TasteVector): number => {
  const load = v[RICH] * 0.5 + v[UMAMI] * 0.3 + v[SWEET] * 0.1 + v[HEAT] * 0.1;
  return Math.max(1, Math.min(3, 1 + load / 2.5));
};

/** Sweet with little savory depth. A sweet-and-savory dish (sticky ribs, tamarind prawns) is still dinner. */
export const isDessertLike = (dish: TasteVector) => dish[0] >= 6 && dish[4] < 4;

/** A drink much sweeter than a savory dish makes the food taste dull. */
const tooSweet = (dish: TasteVector, drink: Drink) => (isDessertLike(dish) ? 0 : Math.max(0, drink.vector[0] - 5) * 1.5);

interface Scored {
  score: number;
  reason: string;
}

/**
 * How well a drink balances a dish, with the main reason. Each rule is a
 * standard pairing principle; the strongest one that applies supplies the reason.
 */
export const balanceScore = (dish: TasteVector, drink: Drink): Scored => {
  const d = drink.vector;
  const rules: Scored[] = [];
  const over = (i: number, from: number) => Math.max(0, dish[i] - from);
  // Dessert follows its own rule: what cuts a rich stew (beer, dry wine) tastes sour and thin next to cake.
  const dessert = isDessertLike(dish);

  if (dish[HEAT] >= 4) {
    const cooling = Math.min(d[SWEET], 6) * 0.5 + d[RICH] * 0.4 - (drink.harshWithHeat ? 4 : 0) - d[BITTER] * 0.3;
    rules.push({
      score: cooling * (1 + over(HEAT, 4) * 0.25),
      reason: d[RICH] >= 4 ? 'Cool and creamy, so it puts out the heat' : 'A little sweetness calms the heat',
    });
  }
  if (dish[RICH] >= 5 && !dessert) {
    rules.push({
      score: (d[SOUR] * 0.5 + (drink.fizzy ? 2 : 0) + d[BITTER] * 0.2 - d[RICH] * 0.4) * (1 + over(RICH, 5) * 0.2),
      reason: !drink.fizzy ? 'Its acidity cuts through the richness' : d[SOUR] >= 5 ? 'Bubbles and acidity cut through the richness' : 'Cold bubbles cut through the richness',
    });
  }
  if (dish[SALTY] >= 5 && !dessert) {
    rules.push({
      score: (drink.fizzy ? 2.5 : 0) + d[SWEET] * 0.3 + d[SOUR] * 0.2 - d[BITTER] * 0.2,
      reason: drink.fizzy ? 'Cold bubbles refresh after salty food' : 'A touch of sweetness softens the salt',
    });
  }
  if (dessert) {
    // A drink less sweet than dessert tastes thin, unless it's bitter on purpose.
    const sweetEnough = d[SWEET] >= dish[SWEET] - 1;
    rules.push({
      score: Math.max(sweetEnough ? d[SWEET] * 0.6 : 0, d[BITTER] >= 5 && d[SWEET] <= 3 ? d[BITTER] * 0.6 : 0) - (drink.fizzy && !sweetEnough ? 1 : 0),
      reason: sweetEnough ? 'Sweet enough to stand up to dessert' : 'Bitter against sweet, like coffee with cake',
    });
  }
  if (dish[SOUR] >= 5 && !dessert) {
    rules.push({
      score: d[SOUR] * 0.5 - d[BITTER] * 0.4 - d[RICH] * 0.2,
      reason: 'Sharp enough that the dish doesn’t make it taste flat',
    });
  }
  if (dish[UMAMI] >= 6 && dish[RICH] >= 4 && dish[HEAT] < 4 && !dessert) {
    rules.push({
      score: d[BITTER] * 0.4 + d[UMAMI] * 0.4 + (drink.body - 1) * 0.8,
      reason: d[BITTER] >= 4 ? 'Its bitterness softens against the fat and savory depth' : 'Savory enough to meet the dish',
    });
  }
  if (rules.length === 0) {
    // A mild dish: anything light and fresh that won't bury it.
    rules.push({ score: d[AROMA] * 0.3 + d[SOUR] * 0.2 - d[BITTER] * 0.3 - d[SWEET] * 0.2, reason: 'Light and fresh, so the dish stays in front' });
  }

  const best = rules.reduce((a, b) => (b.score > a.score ? b : a));
  const total = rules.reduce((sum, r) => sum + r.score, 0);
  const weightGap = Math.abs(dishWeight(dish) - drink.body);
  return { score: total - weightGap * 1.2 - tooSweet(dish, drink), reason: best.reason };
};

const ECHO_NOUN = ['sweetness', 'salt', 'sharpness', 'bitterness', 'savory depth', 'warmth', 'richness', 'fragrance'];

/** How much a drink tastes like the dish: the same strong tastes, at a similar weight. */
export const echoScore = (dish: TasteVector, drink: Drink): Scored => {
  const shared = dish.map((x, i) => Math.min(x, drink.vector[i]));
  // Heat and salt are not things you want doubled.
  shared[HEAT] *= 0.3;
  shared[SALTY] *= 0.3;
  const top = shared.indexOf(Math.max(...shared));
  const clash = dish[HEAT] >= 4 && drink.harshWithHeat ? 4 : 0;
  return {
    score: shared.reduce((a, b) => a + b, 0) - Math.abs(dishWeight(dish) - drink.body) * 2 - clash - tooSweet(dish, drink),
    reason: `Echoes the dish’s ${ECHO_NOUN[top]}`,
  };
};

export interface DrinkPick {
  drink: Drink;
  reason: string;
  /** 'balance' works against the dish's strongest trait; 'echo' leans into it. */
  how: 'balance' | 'echo';
}

/**
 * Drinks for a dish: two that balance it and one that echoes it. With
 * `alcohol: false`, only alcohol-free drinks are considered.
 */
export const drinkPairings = (dish: TasteVector, options: { alcohol: boolean } = { alcohol: true }): DrinkPick[] => {
  if (dish.every((x) => x === 0)) return [];
  const pool = DRINKS.filter((d) => options.alcohol || !d.alcohol);
  const ranked = (score: (d: Drink) => Scored) =>
    pool.map((drink) => ({ drink, ...score(drink) })).sort((a, b) => b.score - a.score || a.drink.name.localeCompare(b.drink.name));

  const picks: DrinkPick[] = [];
  const balance = ranked((d) => balanceScore(dish, d));
  // With alcohol allowed, make sure one of the two balancing picks is alcohol-free.
  const first = balance[0];
  const second = balance.slice(1).find((b) => !options.alcohol || b.drink.alcohol !== first.drink.alcohol) ?? balance[1];
  for (const b of [first, second]) if (b) picks.push({ drink: b.drink, reason: b.reason, how: 'balance' });

  const echo = ranked((d) => echoScore(dish, d)).find((e) => !picks.some((p) => p.drink.name === e.drink.name));
  if (echo && echo.score > 0) picks.push({ drink: echo.drink, reason: echo.reason, how: 'echo' });
  return picks;
};
