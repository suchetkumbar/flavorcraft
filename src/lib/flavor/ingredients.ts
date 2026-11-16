import type { TasteVector } from './tastes';

/**
 * Hand-tuned flavor table. Each value is a 0–10 intensity, in the order
 * [sweet, salty, sour, bitter, umami, heat, rich, aroma].
 *
 * The numbers are culinary estimates for a typical amount of the ingredient in
 * a home recipe, not lab measurements. Keys match at the start of a word in
 * the ingredient name ("strawberries" matches "strawberr"), and the longest
 * match wins ("brown sugar" beats "sugar", "olive oil" beats "olive").
 */
const TABLE: Record<string, TasteVector> = {
  // Salt and salty seasonings
  salt: [0, 10, 0, 0, 1, 0, 0, 0],
  'salt and pepper': [0, 8, 0, 1, 0, 2, 0, 2],
  'soy sauce': [1, 9, 0, 0, 8, 0, 0, 2],
  'fish sauce': [1, 9, 0, 0, 9, 0, 0, 3],
  'oyster sauce': [4, 7, 0, 0, 8, 0, 0, 1],
  worcestershire: [3, 6, 4, 0, 6, 1, 0, 3],
  miso: [2, 8, 0, 0, 9, 0, 1, 2],
  anchov: [0, 8, 0, 0, 9, 0, 2, 2],
  parmesan: [1, 6, 1, 0, 8, 0, 6, 2],
  parmigiano: [1, 6, 1, 0, 8, 0, 6, 2],
  pecorino: [0, 7, 1, 0, 8, 0, 6, 2],
  cheddar: [0, 5, 1, 0, 5, 0, 7, 1],
  cheese: [0, 4, 1, 0, 4, 0, 6, 1],
  feta: [0, 6, 3, 0, 3, 0, 5, 0],
  mozzarella: [1, 2, 1, 0, 2, 0, 6, 0],
  'cream cheese': [2, 2, 2, 0, 1, 0, 8, 0],
  bacon: [1, 7, 0, 0, 7, 0, 7, 3],
  pancetta: [0, 7, 0, 0, 7, 0, 7, 2],
  ham: [1, 6, 0, 0, 6, 0, 4, 1],
  chorizo: [0, 6, 1, 0, 6, 5, 7, 5],
  sausage: [0, 5, 0, 0, 5, 1, 6, 2],
  olive: [0, 6, 2, 2, 3, 0, 3, 2],
  caper: [0, 6, 5, 1, 2, 0, 0, 2],
  stock: [0, 4, 0, 0, 5, 0, 1, 2],
  broth: [0, 4, 0, 0, 5, 0, 1, 2],
  'stock cube': [0, 7, 0, 0, 6, 0, 0, 2],
  'chicken stock': [0, 4, 0, 0, 5, 0, 1, 2],
  'beef stock': [0, 4, 0, 0, 6, 0, 1, 2],
  'vegetable stock': [1, 4, 0, 0, 4, 0, 0, 2],
  'fish stock': [0, 4, 0, 0, 5, 0, 0, 2],
  'chicken broth': [0, 4, 0, 0, 5, 0, 1, 2],
  'beef broth': [0, 4, 0, 0, 6, 0, 1, 2],

  // Umami and proteins
  mushroom: [0, 0, 0, 1, 7, 0, 1, 3],
  tomato: [4, 0, 5, 0, 5, 0, 0, 2],
  'tomato puree': [5, 1, 5, 1, 7, 0, 0, 1],
  'tomato paste': [5, 1, 5, 1, 7, 0, 0, 1],
  ketchup: [8, 4, 5, 0, 4, 0, 0, 1],
  beef: [0, 1, 0, 0, 7, 0, 6, 1],
  chicken: [0, 1, 0, 0, 5, 0, 3, 1],
  lamb: [0, 1, 0, 0, 6, 0, 7, 2],
  pork: [1, 1, 0, 0, 5, 0, 6, 1],
  duck: [0, 1, 0, 0, 6, 0, 8, 2],
  salmon: [0, 1, 0, 0, 5, 0, 7, 1],
  tuna: [0, 2, 0, 0, 6, 0, 3, 1],
  prawn: [2, 2, 0, 0, 6, 0, 2, 1],
  shrimp: [2, 2, 0, 0, 6, 0, 2, 1],
  fish: [0, 1, 0, 0, 4, 0, 2, 1],
  cod: [0, 1, 0, 0, 4, 0, 2, 1],
  haddock: [0, 1, 0, 0, 4, 0, 2, 1],
  egg: [0, 1, 0, 0, 3, 0, 5, 0],
  'egg yolk': [1, 0, 0, 0, 3, 0, 8, 0],
  tofu: [0, 0, 0, 0, 2, 0, 2, 0],

  // Fats and dairy
  butter: [1, 1, 0, 0, 1, 0, 9, 2],
  cream: [2, 0, 0, 0, 0, 0, 8, 1],
  'double cream': [2, 0, 0, 0, 0, 0, 9, 1],
  'heavy cream': [2, 0, 0, 0, 0, 0, 9, 1],
  'sour cream': [1, 1, 5, 0, 0, 0, 7, 0],
  'creme fraiche': [1, 1, 4, 0, 0, 0, 8, 0],
  yogurt: [1, 1, 6, 0, 0, 0, 4, 0],
  yoghurt: [1, 1, 6, 0, 0, 0, 4, 0],
  milk: [3, 0, 0, 0, 0, 0, 4, 0],
  'coconut milk': [4, 0, 0, 0, 0, 0, 8, 4],
  'coconut cream': [4, 0, 0, 0, 0, 0, 9, 4],
  'condensed milk': [10, 0, 0, 0, 0, 0, 7, 1],
  oil: [0, 0, 0, 0, 0, 0, 6, 0],
  'olive oil': [0, 0, 0, 2, 0, 1, 6, 3],
  'sesame oil': [0, 0, 0, 1, 1, 0, 6, 8],
  lard: [0, 0, 0, 0, 1, 0, 9, 1],
  ghee: [1, 0, 0, 0, 1, 0, 9, 4],
  mayonnaise: [1, 2, 3, 0, 0, 0, 9, 0],
  avocado: [0, 0, 0, 1, 0, 0, 7, 1],
  peanut: [3, 1, 0, 1, 2, 0, 7, 4],
  'peanut butter': [4, 3, 0, 1, 2, 0, 9, 4],
  almond: [3, 0, 0, 1, 0, 0, 6, 4],
  walnut: [1, 0, 0, 4, 0, 0, 7, 3],
  'pine nut': [2, 0, 0, 0, 1, 0, 6, 3],
  cashew: [3, 0, 0, 0, 1, 0, 7, 2],
  tahini: [1, 1, 0, 4, 2, 0, 8, 4],
  pesto: [0, 4, 0, 1, 4, 0, 7, 8],
  pastry: [1, 1, 0, 0, 0, 0, 8, 1],

  // Sweeteners and sweet produce
  sugar: [10, 0, 0, 0, 0, 0, 0, 0],
  'brown sugar': [10, 0, 0, 0, 0, 0, 0, 3],
  honey: [9, 0, 1, 0, 0, 0, 0, 4],
  'maple syrup': [9, 0, 0, 0, 0, 0, 0, 4],
  syrup: [9, 0, 0, 0, 0, 0, 0, 1],
  molasses: [7, 1, 0, 4, 1, 0, 0, 4],
  treacle: [7, 1, 0, 4, 1, 0, 0, 4],
  jam: [9, 0, 3, 0, 0, 0, 0, 2],
  mirin: [8, 0, 1, 0, 1, 0, 0, 2],
  hoisin: [8, 4, 1, 0, 4, 1, 0, 5],
  chocolate: [6, 0, 0, 4, 0, 0, 7, 5],
  'dark chocolate': [4, 0, 0, 7, 0, 0, 7, 6],
  cocoa: [1, 0, 0, 9, 0, 0, 2, 6],
  vanilla: [3, 0, 0, 0, 0, 0, 0, 8],
  raisin: [8, 0, 2, 0, 0, 0, 0, 2],
  sultana: [8, 0, 2, 0, 0, 0, 0, 2],
  date: [9, 0, 0, 0, 0, 0, 0, 2],
  apple: [6, 0, 4, 0, 0, 0, 0, 2],
  banana: [7, 0, 1, 0, 0, 0, 1, 3],
  pineapple: [7, 0, 6, 0, 0, 0, 0, 4],
  mango: [8, 0, 3, 0, 0, 0, 0, 5],
  orange: [6, 0, 5, 1, 0, 0, 0, 5],
  berr: [6, 0, 5, 0, 0, 0, 0, 4],
  strawberr: [7, 0, 4, 0, 0, 0, 0, 5],
  raspberr: [6, 0, 6, 0, 0, 0, 0, 5],
  blueberr: [6, 0, 3, 0, 0, 0, 0, 3],
  blackberr: [5, 0, 5, 1, 0, 0, 0, 4],
  cranberr: [4, 0, 8, 1, 0, 0, 0, 3],
  cherr: [7, 0, 4, 0, 0, 0, 0, 3],
  pear: [6, 0, 2, 0, 0, 0, 0, 2],
  peach: [7, 0, 3, 0, 0, 0, 0, 4],
  coconut: [5, 0, 0, 0, 0, 0, 7, 4],
  carrot: [4, 0, 0, 1, 0, 0, 0, 1],
  'sweet potato': [6, 0, 0, 0, 0, 0, 1, 1],
  corn: [6, 0, 0, 0, 1, 0, 1, 1],
  beetroot: [5, 0, 0, 1, 0, 0, 0, 2],
  pumpkin: [5, 0, 0, 0, 0, 0, 1, 1],
  squash: [5, 0, 0, 0, 0, 0, 1, 1],
  peas: [5, 0, 0, 0, 1, 0, 0, 1],
  onion: [3, 0, 0, 1, 2, 1, 0, 4],
  'red onion': [3, 0, 1, 1, 1, 2, 0, 4],
  shallot: [3, 0, 0, 0, 2, 1, 0, 5],
  'spring onion': [1, 0, 0, 1, 1, 1, 0, 5],
  scallion: [1, 0, 0, 1, 1, 1, 0, 5],
  leek: [3, 0, 0, 0, 1, 0, 0, 3],
  'red pepper': [4, 0, 1, 1, 0, 0, 0, 3],
  'green pepper': [2, 0, 1, 2, 0, 0, 0, 3],
  'yellow pepper': [4, 0, 1, 1, 0, 0, 0, 3],
  'bell pepper': [4, 0, 1, 1, 0, 0, 0, 3],

  // Heat
  pepper: [0, 0, 0, 1, 0, 4, 0, 5],
  'black pepper': [0, 0, 0, 1, 0, 4, 0, 5],
  'red pepper flakes': [0, 0, 0, 0, 0, 7, 0, 2],
  cayenne: [0, 0, 0, 0, 0, 9, 0, 2],
  chilli: [1, 0, 0, 0, 0, 8, 0, 3],
  chili: [1, 0, 0, 0, 0, 8, 0, 3],
  'chilli powder': [0, 0, 0, 1, 0, 7, 0, 4],
  'chili powder': [0, 0, 0, 1, 0, 7, 0, 4],
  'sweet chilli sauce': [8, 2, 3, 0, 0, 4, 0, 1],
  jalapeno: [1, 0, 1, 1, 0, 6, 0, 3],
  'scotch bonnet': [2, 0, 0, 0, 0, 10, 0, 5],
  paprika: [2, 0, 0, 1, 0, 2, 0, 5],
  'smoked paprika': [2, 0, 0, 1, 1, 2, 0, 8],
  harissa: [1, 2, 1, 0, 1, 7, 2, 6],
  sriracha: [4, 3, 3, 0, 1, 7, 0, 3],
  'hot sauce': [1, 3, 5, 0, 0, 8, 0, 2],
  tabasco: [1, 3, 5, 0, 0, 8, 0, 2],
  gochujang: [5, 5, 1, 0, 6, 7, 0, 3],
  mustard: [1, 3, 4, 1, 0, 5, 0, 3],
  horseradish: [1, 0, 1, 1, 0, 7, 0, 4],
  wasabi: [1, 0, 1, 1, 0, 7, 0, 4],
  ginger: [2, 0, 0, 0, 0, 5, 0, 8],
  garlic: [1, 0, 0, 1, 3, 3, 0, 8],
  'garlic powder': [0, 0, 0, 0, 2, 1, 0, 6],

  // Sour
  lemon: [1, 0, 9, 1, 0, 0, 0, 6],
  'lemon juice': [1, 0, 9, 0, 0, 0, 0, 4],
  lime: [1, 0, 9, 1, 0, 0, 0, 7],
  zest: [1, 0, 3, 3, 0, 0, 0, 9],
  vinegar: [1, 0, 9, 0, 0, 0, 0, 2],
  'balsamic vinegar': [6, 0, 7, 0, 1, 0, 0, 3],
  'rice vinegar': [3, 0, 7, 0, 0, 0, 0, 1],
  'red wine vinegar': [1, 0, 9, 1, 0, 0, 0, 3],
  wine: [2, 0, 4, 2, 0, 0, 0, 4],
  'white wine': [2, 0, 5, 1, 0, 0, 0, 4],
  'red wine': [2, 0, 4, 4, 1, 0, 0, 5],
  sake: [3, 0, 1, 0, 2, 0, 0, 3],
  tamarind: [5, 0, 9, 0, 0, 0, 0, 3],
  pickle: [2, 5, 8, 0, 0, 0, 0, 2],
  gherkin: [2, 5, 8, 0, 0, 0, 0, 2],
  kimchi: [1, 5, 8, 0, 4, 5, 0, 4],
  sauerkraut: [1, 5, 8, 0, 2, 0, 0, 2],
  sumac: [0, 0, 7, 0, 0, 0, 0, 3],
  grapefruit: [3, 0, 7, 6, 0, 0, 0, 5],

  // Bitter
  coffee: [1, 0, 2, 9, 0, 0, 0, 8],
  espresso: [1, 0, 2, 9, 0, 0, 0, 8],
  tea: [0, 0, 1, 6, 0, 0, 0, 5],
  beer: [2, 0, 1, 5, 1, 0, 0, 3],
  ale: [2, 0, 1, 5, 1, 0, 0, 3],
  kale: [0, 0, 0, 6, 1, 0, 0, 1],
  spinach: [0, 1, 0, 4, 2, 0, 0, 1],
  broccoli: [1, 0, 0, 5, 1, 0, 0, 2],
  rocket: [0, 0, 0, 6, 0, 3, 0, 4],
  arugula: [0, 0, 0, 6, 0, 3, 0, 4],
  radicchio: [1, 0, 0, 8, 0, 0, 0, 1],
  endive: [1, 0, 0, 8, 0, 0, 0, 1],
  cabbage: [3, 0, 0, 3, 1, 0, 0, 1],
  'brussels sprout': [1, 0, 0, 6, 1, 0, 0, 1],
  aubergine: [1, 0, 0, 4, 1, 0, 1, 1],
  eggplant: [1, 0, 0, 4, 1, 0, 1, 1],
  asparagus: [1, 0, 0, 3, 2, 0, 0, 2],
  'green beans': [1, 0, 0, 2, 0, 0, 0, 1],
  turmeric: [0, 0, 0, 6, 0, 1, 0, 5],
  fenugreek: [1, 0, 0, 7, 0, 0, 0, 6],
  celery: [1, 1, 0, 3, 1, 0, 0, 4],
  lettuce: [0, 0, 0, 2, 0, 0, 0, 1],

  // Spices
  cumin: [0, 0, 0, 3, 1, 1, 0, 8],
  coriander: [1, 0, 1, 1, 0, 0, 0, 7],
  cinnamon: [3, 0, 0, 1, 0, 1, 0, 8],
  nutmeg: [1, 0, 0, 2, 0, 1, 0, 7],
  clove: [1, 0, 0, 4, 0, 2, 0, 8],
  cardamom: [2, 0, 0, 1, 0, 1, 0, 9],
  'star anise': [3, 0, 0, 1, 0, 0, 0, 9],
  'garam masala': [1, 0, 0, 2, 0, 3, 0, 9],
  'curry powder': [1, 0, 0, 2, 1, 3, 0, 8],
  'curry paste': [2, 3, 1, 0, 3, 6, 1, 8],
  'five spice': [3, 0, 0, 1, 0, 2, 0, 9],
  allspice: [2, 0, 0, 1, 0, 1, 0, 8],
  saffron: [1, 0, 0, 3, 0, 0, 0, 9],
  fennel: [3, 0, 0, 1, 0, 0, 0, 7],

  // Herbs
  bay: [0, 0, 0, 2, 0, 0, 0, 6],
  thyme: [0, 0, 0, 2, 0, 0, 0, 7],
  rosemary: [0, 0, 0, 3, 0, 0, 0, 8],
  oregano: [0, 0, 0, 3, 0, 1, 0, 7],
  basil: [1, 0, 0, 1, 0, 0, 0, 8],
  parsley: [0, 0, 0, 2, 0, 0, 0, 6],
  mint: [2, 0, 0, 1, 0, 0, 0, 9],
  dill: [0, 0, 1, 1, 0, 0, 0, 7],
  cilantro: [0, 0, 1, 1, 0, 0, 0, 8],
  chives: [0, 0, 0, 1, 1, 1, 0, 6],
  lemongrass: [1, 0, 3, 0, 0, 0, 0, 9],
  'lime leaves': [0, 0, 2, 1, 0, 0, 0, 9],
  sage: [0, 0, 0, 3, 0, 0, 0, 7],
  tarragon: [1, 0, 0, 1, 0, 0, 0, 7],

  // Spirits
  rum: [4, 0, 0, 2, 0, 1, 0, 6],
  brandy: [4, 0, 0, 2, 0, 1, 0, 7],
  cognac: [4, 0, 0, 2, 0, 1, 0, 7],

  // Common TheMealDB ingredients found in a coverage check
  sweetcorn: [6, 0, 0, 0, 1, 0, 1, 1],
  hotsauce: [1, 3, 5, 0, 0, 8, 0, 2],
  sherry: [4, 0, 3, 2, 1, 0, 0, 6],
  'sesame seed': [1, 0, 0, 1, 1, 0, 5, 6],
  'dulce de leche': [10, 1, 0, 1, 0, 0, 7, 3],
  squid: [1, 1, 0, 0, 4, 0, 1, 1],
  clam: [1, 3, 0, 0, 6, 0, 1, 2],
  mussel: [1, 3, 0, 0, 6, 0, 2, 2],
  challot: [3, 0, 0, 0, 2, 1, 0, 5],
  shortening: [0, 0, 0, 0, 0, 0, 9, 0],
  suet: [0, 0, 0, 0, 1, 0, 9, 0],
  steak: [0, 1, 0, 0, 7, 0, 6, 1],
  marjoram: [0, 0, 0, 2, 0, 0, 0, 7],
  caraway: [1, 0, 0, 2, 0, 0, 0, 8],
  galangal: [1, 0, 1, 1, 0, 4, 0, 9],
  cardomom: [2, 0, 0, 1, 0, 1, 0, 9],
  apricot: [7, 0, 4, 0, 0, 0, 0, 4],
  prune: [8, 0, 2, 1, 0, 0, 0, 3],
  'dried fruit': [8, 0, 2, 0, 0, 0, 0, 3],
  pistachio: [2, 0, 0, 1, 0, 0, 6, 4],
  pecan: [3, 0, 0, 2, 0, 0, 7, 4],
  mascarpone: [2, 0, 1, 0, 0, 0, 9, 0],
  ricotta: [2, 1, 1, 0, 1, 0, 6, 0],
  gruyere: [1, 5, 1, 0, 6, 0, 7, 2],
  custard: [7, 0, 0, 0, 0, 0, 7, 4],
  biscuit: [7, 1, 0, 0, 0, 0, 5, 2],
  passata: [4, 0, 5, 0, 5, 0, 0, 1],
  'black pudding': [0, 5, 0, 1, 6, 1, 6, 4],
  celeriac: [2, 0, 0, 2, 1, 0, 0, 4],
  swede: [4, 0, 0, 2, 0, 0, 0, 1],
  baguette: [2, 1, 1, 0, 0, 0, 1, 2],
  macaroni: [1, 0, 0, 0, 0, 0, 1, 0],
  couscous: [1, 0, 0, 0, 0, 0, 0, 0],
  semolina: [1, 0, 0, 0, 0, 0, 0, 0],
  yeast: [0, 0, 0, 1, 1, 0, 0, 1],
  bicarbonate: [0, 1, 0, 2, 0, 0, 0, 0],
  starch: [0, 0, 0, 0, 0, 0, 0, 0],

  // Mostly neutral bases (kept so they count toward coverage)
  rice: [2, 0, 0, 0, 0, 0, 0, 1],
  pasta: [1, 0, 0, 0, 0, 0, 1, 0],
  spaghetti: [1, 0, 0, 0, 0, 0, 1, 0],
  noodle: [1, 0, 0, 0, 0, 0, 1, 0],
  flour: [1, 0, 0, 0, 0, 0, 0, 0],
  bread: [2, 1, 1, 0, 0, 0, 1, 2],
  potato: [1, 0, 0, 0, 1, 0, 1, 0],
  lentil: [1, 0, 0, 1, 2, 0, 0, 1],
  chickpea: [1, 0, 0, 0, 1, 0, 1, 1],
  bean: [1, 0, 0, 0, 2, 0, 1, 0],
  oat: [2, 0, 0, 0, 0, 0, 1, 1],
  quinoa: [1, 0, 0, 2, 0, 0, 0, 1],
  courgette: [1, 0, 0, 1, 0, 0, 0, 1],
  zucchini: [1, 0, 0, 1, 0, 0, 0, 1],
  cucumber: [1, 0, 0, 1, 0, 0, 0, 3],
  water: [0, 0, 0, 0, 0, 0, 0, 0],
  cornflour: [0, 0, 0, 0, 0, 0, 0, 0],
  cornstarch: [0, 0, 0, 0, 0, 0, 0, 0],
  'baking powder': [0, 0, 0, 1, 0, 0, 0, 0],
  'baking soda': [0, 1, 0, 2, 0, 0, 0, 0],
};

/** Keys sorted longest first so the most specific match wins. */
const KEYS = Object.keys(TABLE).sort((a, b) => b.length - a.length);

export const normalizeIngredient = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export interface IngredientMatch {
  key: string;
  vector: TasteVector;
}

const cache = new Map<string, IngredientMatch | null>();

/** Corrections learned from everyone's cooking logs, by table key. See lib/community/crowd.ts. */
let crowd = new Map<string, TasteVector>();

/**
 * Replaces the crowd corrections. Each value is added to the table's vector
 * for that key. Pass an empty map to go back to the hand-tuned table.
 */
export const setCrowdCorrections = (corrections: Map<string, TasteVector>) => {
  crowd = corrections;
  cache.clear();
};

const findKey = (normalized: string) => {
  const padded = ` ${normalized}`;
  return KEYS.find((k) => padded.includes(` ${k}`));
};

/** The hand-tuned entry for an ingredient, ignoring crowd corrections. */
export const baseIngredient = (name: string): IngredientMatch | null => {
  const key = findKey(normalizeIngredient(name));
  return key ? { key, vector: TABLE[key] } : null;
};

export const matchIngredient = (name: string): IngredientMatch | null => {
  const normalized = normalizeIngredient(name);
  if (cache.has(normalized)) return cache.get(normalized) ?? null;
  const key = findKey(normalized);
  const fix = key ? crowd.get(key) : undefined;
  const match = key
    ? { key, vector: fix ? (TABLE[key].map((x, i) => Math.max(0, Math.min(10, x + fix[i]))) as TasteVector) : TABLE[key] }
    : null;
  cache.set(normalized, match);
  return match;
};

/** Ingredient names a user can add when remixing a recipe. */
export const KNOWN_INGREDIENTS = Object.keys(TABLE)
  .filter((k) => !['water', 'baking powder', 'baking soda', 'cornflour', 'cornstarch', 'starch', 'yeast', 'bicarbonate', 'challot', 'cardomom', 'hotsauce', 'berr', 'cherr', 'anchov', 'strawberr', 'raspberr', 'blueberr', 'blackberr', 'cranberr'].includes(k))
  .sort();
