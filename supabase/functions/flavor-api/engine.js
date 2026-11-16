// src/lib/recipes/mealdb.ts
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var clean = (s) => (s ?? "").trim();
var splitSteps = (instructions) => instructions.split(/\r?\n+/).map((line) => line.replace(/^\s*(step\s*)?\d+[.):-]?\s*/i, "").trim()).filter((line) => line.length > 3 && !/^step\s*\d*$/i.test(line));
var normalizeMeal = (meal) => {
  const ingredients = [];
  for (let i = 1; i <= 20; i += 1) {
    const name = clean(meal[`strIngredient${i}`]);
    if (name) ingredients.push({ name, measure: clean(meal[`strMeasure${i}`]) });
  }
  return {
    id: `mdb-${meal.idMeal}`,
    title: clean(meal.strMeal),
    category: clean(meal.strCategory) || "Other",
    area: clean(meal.strArea) || "Unknown",
    image: clean(meal.strMealThumb) || void 0,
    tags: clean(meal.strTags).split(",").map((t) => t.trim()).filter(Boolean),
    ingredients,
    steps: splitSteps(clean(meal.strInstructions)),
    videoUrl: clean(meal.strYoutube) || void 0,
    sourceUrl: clean(meal.strSource) || void 0,
    source: "themealdb"
  };
};

// src/lib/recipes/originals.ts
var ORIGINAL_RECIPES = [
  {
    id: "fc-charred-cabbage-miso-butter",
    title: "Charred Cabbage with Miso Butter",
    category: "Vegetarian",
    area: "Japanese",
    tags: ["Umami", "Side"],
    summary: "Hard-seared cabbage wedges glazed with miso butter and finished with lime.",
    source: "flavorcraft",
    ingredients: [
      { name: "Cabbage", measure: "1 small head" },
      { name: "Butter", measure: "40g" },
      { name: "Miso", measure: "2 tbsp" },
      { name: "Garlic", measure: "2 cloves" },
      { name: "Lime", measure: "1" },
      { name: "Spring Onion", measure: "2" },
      { name: "Chilli Flakes", measure: "pinch" }
    ],
    steps: [
      "Cut the cabbage into 6 wedges, keeping the core so they hold together.",
      "Heat a heavy pan until very hot. Sear the wedges cut side down without moving them for 5 minutes, until deeply charred.",
      "Turn, lower the heat, cover and cook 8 minutes more until tender at the core.",
      "Melt the butter with the miso and grated garlic, whisking until glossy.",
      "Brush the glaze over the cabbage, squeeze over the lime and scatter with spring onion and chilli flakes."
    ]
  },
  {
    id: "fc-tamarind-chilli-prawns",
    title: "Tamarind Chilli Prawns",
    category: "Seafood",
    area: "Thai",
    tags: ["Sour", "Spicy", "Quick"],
    summary: "Sweet, sour and hot prawns in a sticky tamarind glaze, ready in 15 minutes.",
    source: "flavorcraft",
    ingredients: [
      { name: "Prawns", measure: "400g" },
      { name: "Tamarind Paste", measure: "2 tbsp" },
      { name: "Brown Sugar", measure: "1 tbsp" },
      { name: "Fish Sauce", measure: "1 tbsp" },
      { name: "Red Chilli", measure: "2" },
      { name: "Garlic", measure: "3 cloves" },
      { name: "Vegetable Oil", measure: "1 tbsp" },
      { name: "Coriander", measure: "handful" }
    ],
    steps: [
      "Stir the tamarind, sugar and fish sauce together with 2 tbsp water.",
      "Fry the sliced garlic and chilli in the oil for 30 seconds.",
      "Add the prawns and cook 2 minutes until just pink.",
      "Pour in the tamarind mix and bubble until it coats the prawns.",
      "Serve with coriander and rice."
    ]
  },
  {
    id: "fc-bitter-greens-anchovy",
    title: "Bitter Greens with Anchovy and Lemon",
    category: "Side",
    area: "Italian",
    tags: ["Bitter", "Salad"],
    summary: "Radicchio and rocket in a punchy anchovy dressing that tames the bitterness.",
    source: "flavorcraft",
    ingredients: [
      { name: "Radicchio", measure: "1 head" },
      { name: "Rocket", measure: "2 handfuls" },
      { name: "Anchovy Fillet", measure: "4" },
      { name: "Lemon", measure: "1" },
      { name: "Olive Oil", measure: "4 tbsp" },
      { name: "Parmesan", measure: "30g" },
      { name: "Honey", measure: "1 tsp" }
    ],
    steps: [
      "Mash the anchovies to a paste and whisk in the lemon juice, honey and olive oil.",
      "Tear the radicchio and toss with the rocket.",
      "Dress the leaves just before serving and shave parmesan over the top."
    ]
  },
  {
    id: "fc-brown-butter-sage-squash",
    title: "Brown Butter Squash with Sage",
    category: "Vegetarian",
    area: "Italian",
    tags: ["Rich", "Comfort"],
    summary: "Roasted squash in nutty brown butter with crisp sage and a sharp vinegar finish.",
    source: "flavorcraft",
    ingredients: [
      { name: "Butternut Squash", measure: "1" },
      { name: "Butter", measure: "60g" },
      { name: "Sage", measure: "12 leaves" },
      { name: "Balsamic Vinegar", measure: "1 tbsp" },
      { name: "Nutmeg", measure: "pinch" },
      { name: "Salt", measure: "to taste" }
    ],
    steps: [
      "Roast the cubed squash at 220\xB0C for 30 minutes until caramelized at the edges.",
      "Cook the butter over medium heat until it smells nutty and turns golden brown.",
      "Add the sage leaves and fry until crisp, about 30 seconds.",
      "Pour over the squash, grate over nutmeg and finish with balsamic and salt."
    ]
  },
  {
    id: "fc-smoky-black-bean-chilli",
    title: "Smoky Black Bean Chilli",
    category: "Vegan",
    area: "Mexican",
    tags: ["Spicy", "Batch"],
    summary: "A deep, smoky bean chilli with a square of dark chocolate for bitterness.",
    source: "flavorcraft",
    ingredients: [
      { name: "Black Beans", measure: "2 tins" },
      { name: "Onion", measure: "1" },
      { name: "Garlic", measure: "3 cloves" },
      { name: "Smoked Paprika", measure: "2 tsp" },
      { name: "Cumin", measure: "2 tsp" },
      { name: "Chipotle Chilli", measure: "1" },
      { name: "Tomato Paste", measure: "2 tbsp" },
      { name: "Chopped Tomatoes", measure: "1 tin" },
      { name: "Dark Chocolate", measure: "10g" },
      { name: "Lime", measure: "1" }
    ],
    steps: [
      "Soften the onion, then add the garlic, paprika, cumin and chipotle for 1 minute.",
      "Stir in the tomato paste and cook until it darkens.",
      "Add the tomatoes and beans and simmer 30 minutes.",
      "Melt in the chocolate, then season and finish with lime juice."
    ]
  },
  {
    id: "fc-yogurt-mint-lamb",
    title: "Spiced Lamb with Mint Yogurt",
    category: "Lamb",
    area: "Turkish",
    tags: ["Aromatic", "Grill"],
    summary: "Cumin and coriander lamb with cool mint yogurt and pickled red onion.",
    source: "flavorcraft",
    ingredients: [
      { name: "Lamb Mince", measure: "500g" },
      { name: "Cumin", measure: "1 tsp" },
      { name: "Coriander", measure: "1 tsp" },
      { name: "Cinnamon", measure: "pinch" },
      { name: "Greek Yogurt", measure: "200g" },
      { name: "Mint", measure: "handful" },
      { name: "Red Onion", measure: "1" },
      { name: "Red Wine Vinegar", measure: "3 tbsp" },
      { name: "Salt", measure: "1 tsp" }
    ],
    steps: [
      "Slice the onion thinly and cover with the vinegar and a pinch of salt. Leave 15 minutes.",
      "Mix the lamb with the spices and salt and shape into flat skewers.",
      "Grill over high heat for 3\u20134 minutes a side.",
      "Stir the chopped mint into the yogurt.",
      "Serve the lamb with the yogurt and pickled onion."
    ]
  },
  {
    id: "fc-salted-honey-panna-cotta",
    title: "Salted Honey Panna Cotta",
    category: "Dessert",
    area: "Italian",
    tags: ["Sweet", "Make ahead"],
    summary: "A barely set cream with honey and flaky salt, topped with sharp raspberries.",
    source: "flavorcraft",
    ingredients: [
      { name: "Double Cream", measure: "400ml" },
      { name: "Milk", measure: "100ml" },
      { name: "Honey", measure: "4 tbsp" },
      { name: "Gelatine Leaves", measure: "2" },
      { name: "Vanilla", measure: "1 pod" },
      { name: "Flaky Salt", measure: "pinch" },
      { name: "Raspberries", measure: "150g" }
    ],
    steps: [
      "Soak the gelatine in cold water for 5 minutes.",
      "Warm the cream, milk, honey and vanilla seeds until steaming. Do not boil.",
      "Squeeze out the gelatine and stir it in until dissolved.",
      "Pour into 4 glasses and chill for at least 4 hours.",
      "Top with raspberries and a few flakes of salt."
    ]
  },
  {
    id: "fc-ginger-scallion-noodles",
    title: "Ginger Scallion Noodles",
    category: "Vegetarian",
    area: "Chinese",
    tags: ["Aromatic", "Quick"],
    summary: "Noodles tossed in sizzling ginger and spring onion oil with soy and black vinegar.",
    source: "flavorcraft",
    ingredients: [
      { name: "Noodles", measure: "200g" },
      { name: "Ginger", measure: "40g" },
      { name: "Spring Onion", measure: "6" },
      { name: "Vegetable Oil", measure: "4 tbsp" },
      { name: "Soy Sauce", measure: "2 tbsp" },
      { name: "Rice Vinegar", measure: "1 tbsp" },
      { name: "Sesame Oil", measure: "1 tsp" },
      { name: "Sugar", measure: "1 tsp" }
    ],
    steps: [
      "Finely chop the ginger and spring onion and put them in a heatproof bowl with a pinch of salt.",
      "Heat the oil until shimmering and pour it over. It should sizzle hard.",
      "Stir in the soy, vinegar, sesame oil and sugar.",
      "Cook the noodles, drain and toss through the sauce."
    ]
  }
];

// src/lib/flavor/ingredients.ts
var TABLE = {
  // Salt and salty seasonings
  salt: [0, 10, 0, 0, 1, 0, 0, 0],
  "salt and pepper": [0, 8, 0, 1, 0, 2, 0, 2],
  "soy sauce": [1, 9, 0, 0, 8, 0, 0, 2],
  "fish sauce": [1, 9, 0, 0, 9, 0, 0, 3],
  "oyster sauce": [4, 7, 0, 0, 8, 0, 0, 1],
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
  "cream cheese": [2, 2, 2, 0, 1, 0, 8, 0],
  bacon: [1, 7, 0, 0, 7, 0, 7, 3],
  pancetta: [0, 7, 0, 0, 7, 0, 7, 2],
  ham: [1, 6, 0, 0, 6, 0, 4, 1],
  chorizo: [0, 6, 1, 0, 6, 5, 7, 5],
  sausage: [0, 5, 0, 0, 5, 1, 6, 2],
  olive: [0, 6, 2, 2, 3, 0, 3, 2],
  caper: [0, 6, 5, 1, 2, 0, 0, 2],
  stock: [0, 4, 0, 0, 5, 0, 1, 2],
  broth: [0, 4, 0, 0, 5, 0, 1, 2],
  "stock cube": [0, 7, 0, 0, 6, 0, 0, 2],
  "chicken stock": [0, 4, 0, 0, 5, 0, 1, 2],
  "beef stock": [0, 4, 0, 0, 6, 0, 1, 2],
  "vegetable stock": [1, 4, 0, 0, 4, 0, 0, 2],
  "fish stock": [0, 4, 0, 0, 5, 0, 0, 2],
  "chicken broth": [0, 4, 0, 0, 5, 0, 1, 2],
  "beef broth": [0, 4, 0, 0, 6, 0, 1, 2],
  // Umami and proteins
  mushroom: [0, 0, 0, 1, 7, 0, 1, 3],
  tomato: [4, 0, 5, 0, 5, 0, 0, 2],
  "tomato puree": [5, 1, 5, 1, 7, 0, 0, 1],
  "tomato paste": [5, 1, 5, 1, 7, 0, 0, 1],
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
  "egg yolk": [1, 0, 0, 0, 3, 0, 8, 0],
  tofu: [0, 0, 0, 0, 2, 0, 2, 0],
  // Fats and dairy
  butter: [1, 1, 0, 0, 1, 0, 9, 2],
  cream: [2, 0, 0, 0, 0, 0, 8, 1],
  "double cream": [2, 0, 0, 0, 0, 0, 9, 1],
  "heavy cream": [2, 0, 0, 0, 0, 0, 9, 1],
  "sour cream": [1, 1, 5, 0, 0, 0, 7, 0],
  "creme fraiche": [1, 1, 4, 0, 0, 0, 8, 0],
  yogurt: [1, 1, 6, 0, 0, 0, 4, 0],
  yoghurt: [1, 1, 6, 0, 0, 0, 4, 0],
  milk: [3, 0, 0, 0, 0, 0, 4, 0],
  "coconut milk": [4, 0, 0, 0, 0, 0, 8, 4],
  "coconut cream": [4, 0, 0, 0, 0, 0, 9, 4],
  "condensed milk": [10, 0, 0, 0, 0, 0, 7, 1],
  oil: [0, 0, 0, 0, 0, 0, 6, 0],
  "olive oil": [0, 0, 0, 2, 0, 1, 6, 3],
  "sesame oil": [0, 0, 0, 1, 1, 0, 6, 8],
  lard: [0, 0, 0, 0, 1, 0, 9, 1],
  ghee: [1, 0, 0, 0, 1, 0, 9, 4],
  mayonnaise: [1, 2, 3, 0, 0, 0, 9, 0],
  avocado: [0, 0, 0, 1, 0, 0, 7, 1],
  peanut: [3, 1, 0, 1, 2, 0, 7, 4],
  "peanut butter": [4, 3, 0, 1, 2, 0, 9, 4],
  almond: [3, 0, 0, 1, 0, 0, 6, 4],
  walnut: [1, 0, 0, 4, 0, 0, 7, 3],
  "pine nut": [2, 0, 0, 0, 1, 0, 6, 3],
  cashew: [3, 0, 0, 0, 1, 0, 7, 2],
  tahini: [1, 1, 0, 4, 2, 0, 8, 4],
  pesto: [0, 4, 0, 1, 4, 0, 7, 8],
  pastry: [1, 1, 0, 0, 0, 0, 8, 1],
  // Sweeteners and sweet produce
  sugar: [10, 0, 0, 0, 0, 0, 0, 0],
  "brown sugar": [10, 0, 0, 0, 0, 0, 0, 3],
  honey: [9, 0, 1, 0, 0, 0, 0, 4],
  "maple syrup": [9, 0, 0, 0, 0, 0, 0, 4],
  syrup: [9, 0, 0, 0, 0, 0, 0, 1],
  molasses: [7, 1, 0, 4, 1, 0, 0, 4],
  treacle: [7, 1, 0, 4, 1, 0, 0, 4],
  jam: [9, 0, 3, 0, 0, 0, 0, 2],
  mirin: [8, 0, 1, 0, 1, 0, 0, 2],
  hoisin: [8, 4, 1, 0, 4, 1, 0, 5],
  chocolate: [6, 0, 0, 4, 0, 0, 7, 5],
  "dark chocolate": [4, 0, 0, 7, 0, 0, 7, 6],
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
  "sweet potato": [6, 0, 0, 0, 0, 0, 1, 1],
  corn: [6, 0, 0, 0, 1, 0, 1, 1],
  beetroot: [5, 0, 0, 1, 0, 0, 0, 2],
  pumpkin: [5, 0, 0, 0, 0, 0, 1, 1],
  squash: [5, 0, 0, 0, 0, 0, 1, 1],
  peas: [5, 0, 0, 0, 1, 0, 0, 1],
  onion: [3, 0, 0, 1, 2, 1, 0, 4],
  "red onion": [3, 0, 1, 1, 1, 2, 0, 4],
  shallot: [3, 0, 0, 0, 2, 1, 0, 5],
  "spring onion": [1, 0, 0, 1, 1, 1, 0, 5],
  scallion: [1, 0, 0, 1, 1, 1, 0, 5],
  leek: [3, 0, 0, 0, 1, 0, 0, 3],
  "red pepper": [4, 0, 1, 1, 0, 0, 0, 3],
  "green pepper": [2, 0, 1, 2, 0, 0, 0, 3],
  "yellow pepper": [4, 0, 1, 1, 0, 0, 0, 3],
  "bell pepper": [4, 0, 1, 1, 0, 0, 0, 3],
  // Heat
  pepper: [0, 0, 0, 1, 0, 4, 0, 5],
  "black pepper": [0, 0, 0, 1, 0, 4, 0, 5],
  "red pepper flakes": [0, 0, 0, 0, 0, 7, 0, 2],
  cayenne: [0, 0, 0, 0, 0, 9, 0, 2],
  chilli: [1, 0, 0, 0, 0, 8, 0, 3],
  chili: [1, 0, 0, 0, 0, 8, 0, 3],
  "chilli powder": [0, 0, 0, 1, 0, 7, 0, 4],
  "chili powder": [0, 0, 0, 1, 0, 7, 0, 4],
  "sweet chilli sauce": [8, 2, 3, 0, 0, 4, 0, 1],
  jalapeno: [1, 0, 1, 1, 0, 6, 0, 3],
  "scotch bonnet": [2, 0, 0, 0, 0, 10, 0, 5],
  paprika: [2, 0, 0, 1, 0, 2, 0, 5],
  "smoked paprika": [2, 0, 0, 1, 1, 2, 0, 8],
  harissa: [1, 2, 1, 0, 1, 7, 2, 6],
  sriracha: [4, 3, 3, 0, 1, 7, 0, 3],
  "hot sauce": [1, 3, 5, 0, 0, 8, 0, 2],
  tabasco: [1, 3, 5, 0, 0, 8, 0, 2],
  gochujang: [5, 5, 1, 0, 6, 7, 0, 3],
  mustard: [1, 3, 4, 1, 0, 5, 0, 3],
  horseradish: [1, 0, 1, 1, 0, 7, 0, 4],
  wasabi: [1, 0, 1, 1, 0, 7, 0, 4],
  ginger: [2, 0, 0, 0, 0, 5, 0, 8],
  garlic: [1, 0, 0, 1, 3, 3, 0, 8],
  "garlic powder": [0, 0, 0, 0, 2, 1, 0, 6],
  // Sour
  lemon: [1, 0, 9, 1, 0, 0, 0, 6],
  "lemon juice": [1, 0, 9, 0, 0, 0, 0, 4],
  lime: [1, 0, 9, 1, 0, 0, 0, 7],
  zest: [1, 0, 3, 3, 0, 0, 0, 9],
  vinegar: [1, 0, 9, 0, 0, 0, 0, 2],
  "balsamic vinegar": [6, 0, 7, 0, 1, 0, 0, 3],
  "rice vinegar": [3, 0, 7, 0, 0, 0, 0, 1],
  "red wine vinegar": [1, 0, 9, 1, 0, 0, 0, 3],
  wine: [2, 0, 4, 2, 0, 0, 0, 4],
  "white wine": [2, 0, 5, 1, 0, 0, 0, 4],
  "red wine": [2, 0, 4, 4, 1, 0, 0, 5],
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
  "brussels sprout": [1, 0, 0, 6, 1, 0, 0, 1],
  aubergine: [1, 0, 0, 4, 1, 0, 1, 1],
  eggplant: [1, 0, 0, 4, 1, 0, 1, 1],
  asparagus: [1, 0, 0, 3, 2, 0, 0, 2],
  "green beans": [1, 0, 0, 2, 0, 0, 0, 1],
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
  "star anise": [3, 0, 0, 1, 0, 0, 0, 9],
  "garam masala": [1, 0, 0, 2, 0, 3, 0, 9],
  "curry powder": [1, 0, 0, 2, 1, 3, 0, 8],
  "curry paste": [2, 3, 1, 0, 3, 6, 1, 8],
  "five spice": [3, 0, 0, 1, 0, 2, 0, 9],
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
  "lime leaves": [0, 0, 2, 1, 0, 0, 0, 9],
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
  "sesame seed": [1, 0, 0, 1, 1, 0, 5, 6],
  "dulce de leche": [10, 1, 0, 1, 0, 0, 7, 3],
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
  "dried fruit": [8, 0, 2, 0, 0, 0, 0, 3],
  pistachio: [2, 0, 0, 1, 0, 0, 6, 4],
  pecan: [3, 0, 0, 2, 0, 0, 7, 4],
  mascarpone: [2, 0, 1, 0, 0, 0, 9, 0],
  ricotta: [2, 1, 1, 0, 1, 0, 6, 0],
  gruyere: [1, 5, 1, 0, 6, 0, 7, 2],
  custard: [7, 0, 0, 0, 0, 0, 7, 4],
  biscuit: [7, 1, 0, 0, 0, 0, 5, 2],
  passata: [4, 0, 5, 0, 5, 0, 0, 1],
  "black pudding": [0, 5, 0, 1, 6, 1, 6, 4],
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
  "baking powder": [0, 0, 0, 1, 0, 0, 0, 0],
  "baking soda": [0, 1, 0, 2, 0, 0, 0, 0]
};
var KEYS = Object.keys(TABLE).sort((a, b) => b.length - a.length);
var normalizeIngredient = (name) => name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
var cache = /* @__PURE__ */ new Map();
var crowd = /* @__PURE__ */ new Map();
var findKey = (normalized) => {
  const padded = ` ${normalized}`;
  return KEYS.find((k) => padded.includes(` ${k}`));
};
var matchIngredient = (name) => {
  const normalized = normalizeIngredient(name);
  if (cache.has(normalized)) return cache.get(normalized) ?? null;
  const key = findKey(normalized);
  const fix = key ? crowd.get(key) : void 0;
  const match = key ? { key, vector: fix ? TABLE[key].map((x, i) => Math.max(0, Math.min(10, x + fix[i]))) : TABLE[key] } : null;
  cache.set(normalized, match);
  return match;
};
var KNOWN_INGREDIENTS = Object.keys(TABLE).filter((k) => !["water", "baking powder", "baking soda", "cornflour", "cornstarch", "starch", "yeast", "bicarbonate", "challot", "cardomom", "hotsauce", "berr", "cherr", "anchov", "strawberr", "raspberr", "blueberr", "blackberr", "cranberr"].includes(k)).sort();

// src/lib/flavor/tastes.ts
var TASTE_KEYS = [
  "sweet",
  "salty",
  "sour",
  "bitter",
  "umami",
  "heat",
  "rich",
  "aroma"
];
var TASTES = [
  { key: "sweet", label: "Sweet", color: "#D9779F", hint: "sugar, fruit, honey" },
  { key: "salty", label: "Salty", color: "#4F74A8", hint: "salt, soy, cheese" },
  { key: "sour", label: "Sour", color: "#9AA61A", hint: "citrus, vinegar, yogurt" },
  { key: "bitter", label: "Bitter", color: "#4E6B47", hint: "greens, cocoa, coffee" },
  { key: "umami", label: "Umami", color: "#8A5534", hint: "mushroom, tomato, broth" },
  { key: "heat", label: "Heat", color: "#D93A22", hint: "chilli, pepper, ginger" },
  { key: "rich", label: "Richness", color: "#C99A1E", hint: "butter, cream, oil" },
  { key: "aroma", label: "Aroma", color: "#7B5CB8", hint: "herbs, spices, zest" }
];
var TASTE_BY_KEY = Object.fromEntries(
  TASTES.map((t) => [t.key, t])
);
var emptyVector = () => [0, 0, 0, 0, 0, 0, 0, 0];
var clampVector = (v2) => v2.map((x) => Math.max(0, Math.min(10, x)));
var describeProfile = (v2) => {
  const ranked = TASTES.map((t, i) => ({ label: t.label.toLowerCase(), value: v2[i] })).filter((t) => t.value >= 4).sort((a, b) => b.value - a.value).slice(0, 3).map((t) => t.label);
  if (ranked.length === 0) return "Mild, with no strong taste";
  if (ranked.length === 1) return `Mostly ${ranked[0]}`;
  return `Mostly ${ranked.slice(0, -1).join(", ")} and ${ranked[ranked.length - 1]}`;
};

// src/lib/flavor/profile.ts
var amountFactor = (measure) => {
  const m = measure.toLowerCase();
  if (/pinch|dash|to taste|sprinkl|garnish|few drops/.test(m)) return 0.6;
  if (/\btsp\b|teaspoon/.test(m)) return 0.8;
  return 1;
};
var RANK_WEIGHTS = [0.55, 0.25, 0.12];
var REST_WEIGHT = 0.05;
var computeProfile = (ingredients) => {
  const perDim = TASTE_KEYS.map(() => []);
  let matched = 0;
  for (const line of ingredients) {
    const match = matchIngredient(line.name);
    if (!match) continue;
    matched += 1;
    const factor = amountFactor(line.measure);
    match.vector.forEach((value, i) => {
      if (value > 0) perDim[i].push({ name: line.name, value: value * factor });
    });
  }
  const vector = emptyVector();
  const sources = [];
  perDim.forEach((contributions, i) => {
    contributions.sort((a, b) => b.value - a.value);
    vector[i] = contributions.reduce(
      (sum, c, rank) => sum + c.value * (RANK_WEIGHTS[rank] ?? REST_WEIGHT),
      0
    );
    sources.push(
      contributions.filter((c) => c.value >= 3).slice(0, 3).map((c) => c.name)
    );
  });
  return {
    vector: clampVector(vector.map((v2) => Math.round(v2 * 10) / 10)),
    sources,
    matched,
    total: ingredients.length
  };
};

// src/lib/community/tree.ts
var NOTICEABLE = 0.5;
var tasteChanges = (from, to) => to.map((v2, taste) => ({ taste, delta: Math.round((v2 - from[taste]) * 10) / 10 })).filter((c) => Math.abs(c.delta) >= NOTICEABLE).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
var MORE = ["Sweeter", "Saltier", "More sour", "More bitter", "More savory", "Hotter", "Richer", "More aromatic"];
var LESS = ["Less sweet", "Less salty", "Less sour", "Less bitter", "Less savory", "Milder", "Lighter", "Less aromatic"];
var changeWords = (changes, max = 2) => changes.length === 0 ? "Tastes about the same" : changes.slice(0, max).map((c, i) => {
  const word = (c.delta > 0 ? MORE : LESS)[c.taste];
  return i === 0 ? word : word.toLowerCase();
}).join(", ");

// src/lib/flavor/balance.ts
var v = (p, k) => p[TASTE_KEYS.indexOf(k)];
var RULES = [
  {
    id: "rich-no-acid",
    // Not for desserts: sweet and rich is the point of a rice pudding.
    test: (p) => v(p, "rich") >= 7 && v(p, "sour") < 2.5 && v(p, "bitter") < 2.5 && v(p, "sweet") < 5,
    label: "Rich with no acid",
    suggestion: "Serve it with something sharp, like pickles, a lemony salad or a squeeze of lemon, to lift it.",
    problem: "too-heavy"
  },
  {
    id: "hot-no-cooling",
    test: (p) => v(p, "heat") >= 7 && v(p, "rich") < 3 && v(p, "sweet") < 3,
    label: "Hot with nothing to cool it",
    suggestion: "Serve with yogurt, coconut or something sweet to take the edge off.",
    problem: "too-spicy"
  },
  {
    id: "savory-too-sweet",
    // Savory dishes only (desserts are meant to be sweet): clear umami, lots of sugar, no acid.
    test: (p) => v(p, "sweet") >= 7 && v(p, "umami") >= 4 && v(p, "sour") < 2.5,
    label: "Sweet for a savory dish",
    suggestion: "A splash of vinegar or citrus, or a pinch of salt, will pull it back toward savory.",
    problem: "too-sweet"
  },
  {
    id: "salty-unbalanced",
    test: (p) => v(p, "salty") >= 7.5 && v(p, "sour") < 2 && v(p, "sweet") < 2.5 && v(p, "rich") < 4,
    label: "Salty with little to balance it",
    suggestion: "Taste before adding more salt; acid or a little sweetness rounds it out.",
    problem: "too-salty"
  },
  {
    id: "savory-no-lift",
    test: (p) => v(p, "umami") >= 6.5 && v(p, "aroma") < 3 && v(p, "sour") < 3,
    label: "Savory but flat",
    suggestion: "Fresh herbs or citrus zest just before serving will brighten it.",
    problem: "flat"
  }
];
var MIN_COVERAGE = 0.7;
var balanceWarnings = (flavor, max = 1) => {
  if (flavor.total === 0 || flavor.matched / flavor.total < MIN_COVERAGE) return [];
  return RULES.filter((r) => r.test(flavor.vector)).slice(0, max).map(({ id, label, suggestion, problem }) => ({ id, label, suggestion, problem }));
};

// src/lib/flavor/drinks.ts
var DRINKS = [
  { name: "Dry Riesling", style: "crisp white wine", alcohol: true, vector: [3, 0, 7, 0, 0, 0, 0, 6], body: 1 },
  { name: "Off-dry Riesling", style: "lightly sweet white wine", alcohol: true, vector: [6, 0, 6, 0, 0, 0, 1, 6], body: 1 },
  { name: "Sauvignon Blanc", style: "sharp, grassy white wine", alcohol: true, vector: [1, 0, 8, 1, 0, 0, 0, 7], body: 1 },
  { name: "Oaked Chardonnay", style: "full, buttery white wine", alcohol: true, vector: [2, 0, 4, 1, 0, 0, 6, 4], body: 3 },
  { name: "Dry ros\xE9", style: "pale, crisp pink wine", alcohol: true, vector: [2, 0, 6, 0, 0, 0, 1, 5], body: 1 },
  { name: "Pinot Noir", style: "light, fruity red wine", alcohol: true, vector: [2, 0, 5, 2, 2, 0, 2, 6], body: 2 },
  { name: "Chianti", style: "sharp, savory Italian red", alcohol: true, vector: [1, 0, 6, 4, 3, 0, 2, 5], body: 2, harshWithHeat: true },
  { name: "Cabernet Sauvignon", style: "dark, tannic red wine", alcohol: true, vector: [1, 0, 4, 6, 3, 0, 4, 5], body: 3, harshWithHeat: true },
  { name: "Dry sparkling wine", style: "Cava, Cr\xE9mant or Champagne", alcohol: true, vector: [1, 0, 7, 1, 1, 0, 0, 4], body: 1, fizzy: true },
  { name: "Fino sherry", style: "bone-dry, salty, nutty", alcohol: true, vector: [0, 2, 5, 2, 4, 0, 1, 5], body: 2 },
  { name: "Lager", style: "cold, crisp, lightly bitter beer", alcohol: true, vector: [1, 0, 2, 3, 0, 0, 0, 2], body: 1, fizzy: true },
  { name: "Wheat beer", style: "soft, cloudy, citrusy beer", alcohol: true, vector: [3, 0, 3, 1, 0, 0, 2, 5], body: 2, fizzy: true },
  { name: "India pale ale", style: "hoppy, bitter beer", alcohol: true, vector: [2, 0, 2, 8, 0, 0, 1, 7], body: 2, fizzy: true, harshWithHeat: true },
  { name: "Stout", style: "dark, roasted, creamy beer", alcohol: true, vector: [3, 0, 1, 6, 2, 0, 5, 4], body: 3 },
  { name: "Dry cider", style: "sharp apple cider", alcohol: true, vector: [3, 0, 6, 1, 0, 0, 0, 4], body: 1, fizzy: true },
  { name: "Sake", style: "smooth, savory rice wine", alcohol: true, vector: [3, 0, 2, 0, 5, 0, 2, 4], body: 2 },
  { name: "Margarita", style: "tequila, lime and salt", alcohol: true, vector: [3, 2, 8, 1, 0, 0, 0, 5], body: 2, harshWithHeat: true },
  { name: "Sweet dessert wine", style: "Sauternes, Tokaji or late-harvest", alcohol: true, vector: [9, 0, 5, 0, 0, 0, 3, 6], body: 3 },
  { name: "Sparkling water with lemon", style: "cold and sharp", alcohol: false, vector: [0, 0, 5, 0, 0, 0, 0, 3], body: 1, fizzy: true },
  { name: "Mango lassi", style: "sweet yogurt drink", alcohol: false, vector: [7, 0, 4, 0, 0, 0, 6, 4], body: 3 },
  { name: "Salted lassi", style: "thin, salty yogurt drink", alcohol: false, vector: [1, 3, 5, 0, 0, 0, 4, 2], body: 2 },
  { name: "Ginger beer", style: "sweet, fiery and fizzy", alcohol: false, vector: [6, 0, 3, 0, 0, 5, 0, 6], body: 2, fizzy: true },
  { name: "Lemonade", style: "cloudy, sweet and sharp", alcohol: false, vector: [6, 0, 8, 0, 0, 0, 0, 4], body: 1 },
  { name: "Iced green tea", style: "unsweetened, grassy", alcohol: false, vector: [0, 0, 1, 4, 2, 0, 0, 5], body: 1 },
  { name: "Black tea", style: "hot, strong, a little tannic", alcohol: false, vector: [0, 0, 1, 5, 1, 0, 0, 4], body: 2 },
  { name: "Mint tea", style: "hot, sweet, very fragrant", alcohol: false, vector: [4, 0, 0, 2, 0, 0, 0, 8], body: 1 },
  { name: "Espresso", style: "short, bitter coffee", alcohol: false, vector: [0, 0, 2, 9, 1, 0, 2, 7], body: 3 },
  { name: "Kombucha", style: "sour, lightly fizzy fermented tea", alcohol: false, vector: [3, 0, 7, 1, 1, 0, 0, 4], body: 1, fizzy: true },
  { name: "Tomato juice", style: "savory, with a squeeze of lemon", alcohol: false, vector: [3, 3, 4, 0, 6, 1, 1, 2], body: 2 },
  { name: "Hibiscus iced tea", style: "tart, deep red, lightly sweet", alcohol: false, vector: [4, 0, 7, 1, 0, 0, 0, 6], body: 1 },
  { name: "Cold milk", style: "plain and cooling", alcohol: false, vector: [3, 0, 0, 0, 0, 0, 5, 0], body: 2 }
];
var [SWEET, SALTY, SOUR, BITTER, UMAMI, HEAT, RICH, AROMA] = [0, 1, 2, 3, 4, 5, 6, 7];
var dishWeight = (v2) => {
  const load = v2[RICH] * 0.5 + v2[UMAMI] * 0.3 + v2[SWEET] * 0.1 + v2[HEAT] * 0.1;
  return Math.max(1, Math.min(3, 1 + load / 2.5));
};
var isDessertLike = (dish) => dish[0] >= 6 && dish[4] < 4;
var tooSweet = (dish, drink) => isDessertLike(dish) ? 0 : Math.max(0, drink.vector[0] - 5) * 1.5;
var balanceScore = (dish, drink) => {
  const d = drink.vector;
  const rules = [];
  const over = (i, from) => Math.max(0, dish[i] - from);
  const dessert = isDessertLike(dish);
  if (dish[HEAT] >= 4) {
    const cooling = Math.min(d[SWEET], 6) * 0.5 + d[RICH] * 0.4 - (drink.harshWithHeat ? 4 : 0) - d[BITTER] * 0.3;
    rules.push({
      score: cooling * (1 + over(HEAT, 4) * 0.25),
      reason: d[RICH] >= 4 ? "Cool and creamy, so it puts out the heat" : "A little sweetness calms the heat"
    });
  }
  if (dish[RICH] >= 5 && !dessert) {
    rules.push({
      score: (d[SOUR] * 0.5 + (drink.fizzy ? 2 : 0) + d[BITTER] * 0.2 - d[RICH] * 0.4) * (1 + over(RICH, 5) * 0.2),
      reason: !drink.fizzy ? "Its acidity cuts through the richness" : d[SOUR] >= 5 ? "Bubbles and acidity cut through the richness" : "Cold bubbles cut through the richness"
    });
  }
  if (dish[SALTY] >= 5 && !dessert) {
    rules.push({
      score: (drink.fizzy ? 2.5 : 0) + d[SWEET] * 0.3 + d[SOUR] * 0.2 - d[BITTER] * 0.2,
      reason: drink.fizzy ? "Cold bubbles refresh after salty food" : "A touch of sweetness softens the salt"
    });
  }
  if (dessert) {
    const sweetEnough = d[SWEET] >= dish[SWEET] - 1;
    rules.push({
      score: Math.max(sweetEnough ? d[SWEET] * 0.6 : 0, d[BITTER] >= 5 && d[SWEET] <= 3 ? d[BITTER] * 0.6 : 0) - (drink.fizzy && !sweetEnough ? 1 : 0),
      reason: sweetEnough ? "Sweet enough to stand up to dessert" : "Bitter against sweet, like coffee with cake"
    });
  }
  if (dish[SOUR] >= 5 && !dessert) {
    rules.push({
      score: d[SOUR] * 0.5 - d[BITTER] * 0.4 - d[RICH] * 0.2,
      reason: "Sharp enough that the dish doesn\u2019t make it taste flat"
    });
  }
  if (dish[UMAMI] >= 6 && dish[RICH] >= 4 && dish[HEAT] < 4 && !dessert) {
    rules.push({
      score: d[BITTER] * 0.4 + d[UMAMI] * 0.4 + (drink.body - 1) * 0.8,
      reason: d[BITTER] >= 4 ? "Its bitterness softens against the fat and savory depth" : "Savory enough to meet the dish"
    });
  }
  if (rules.length === 0) {
    rules.push({ score: d[AROMA] * 0.3 + d[SOUR] * 0.2 - d[BITTER] * 0.3 - d[SWEET] * 0.2, reason: "Light and fresh, so the dish stays in front" });
  }
  const best = rules.reduce((a, b) => b.score > a.score ? b : a);
  const total = rules.reduce((sum, r) => sum + r.score, 0);
  const weightGap = Math.abs(dishWeight(dish) - drink.body);
  return { score: total - weightGap * 1.2 - tooSweet(dish, drink), reason: best.reason };
};
var ECHO_NOUN = ["sweetness", "salt", "sharpness", "bitterness", "savory depth", "warmth", "richness", "fragrance"];
var echoScore = (dish, drink) => {
  const shared = dish.map((x, i) => Math.min(x, drink.vector[i]));
  shared[HEAT] *= 0.3;
  shared[SALTY] *= 0.3;
  const top = shared.indexOf(Math.max(...shared));
  const clash = dish[HEAT] >= 4 && drink.harshWithHeat ? 4 : 0;
  return {
    score: shared.reduce((a, b) => a + b, 0) - Math.abs(dishWeight(dish) - drink.body) * 2 - clash - tooSweet(dish, drink),
    reason: `Echoes the dish\u2019s ${ECHO_NOUN[top]}`
  };
};
var drinkPairings = (dish, options = { alcohol: true }) => {
  if (dish.every((x) => x === 0)) return [];
  const pool = DRINKS.filter((d) => options.alcohol || !d.alcohol);
  const ranked = (score) => pool.map((drink) => ({ drink, ...score(drink) })).sort((a, b) => b.score - a.score || a.drink.name.localeCompare(b.drink.name));
  const picks = [];
  const balance = ranked((d) => balanceScore(dish, d));
  const first = balance[0];
  const second = balance.slice(1).find((b) => !options.alcohol || b.drink.alcohol !== first.drink.alcohol) ?? balance[1];
  for (const b of [first, second]) if (b) picks.push({ drink: b.drink, reason: b.reason, how: "balance" });
  const echo = ranked((d) => echoScore(dish, d)).find((e) => !picks.some((p) => p.drink.name === e.drink.name));
  if (echo && echo.score > 0) picks.push({ drink: echo.drink, reason: echo.reason, how: "echo" });
  return picks;
};

// src/lib/pantry/match.ts
var FAMILIES = [
  { why: "both add acidity", keys: ["lemon", "lemon juice", "lime", "vinegar", "rice vinegar", "red wine vinegar", "balsamic vinegar"] },
  { why: "both are cooking fats", keys: ["butter", "olive oil", "oil", "ghee", "lard"] },
  { why: "both are creamy dairy", keys: ["cream", "double cream", "heavy cream", "creme fraiche", "sour cream", "yogurt", "yoghurt", "mascarpone"] },
  { why: "both are milks", keys: ["milk", "coconut milk"] },
  { why: "both sweeten", keys: ["sugar", "brown sugar", "honey", "maple syrup", "syrup", "molasses", "treacle"] },
  { why: "both add chilli heat", keys: ["chilli", "chili", "chilli powder", "chili powder", "cayenne", "red pepper flakes", "hot sauce", "tabasco", "sriracha", "jalapeno", "scotch bonnet"] },
  { why: "both are onions", keys: ["onion", "red onion", "shallot", "challot", "spring onion", "scallion", "leek"] },
  { why: "both are soft herbs", keys: ["parsley", "coriander", "cilantro", "basil", "mint", "dill", "chives", "tarragon"] },
  { why: "both are woody herbs", keys: ["thyme", "rosemary", "oregano", "sage", "marjoram", "bay"] },
  { why: "both are stocks", keys: ["stock", "chicken stock", "beef stock", "vegetable stock", "fish stock", "broth", "chicken broth", "beef broth", "stock cube"] },
  { why: "both are salty sauces", keys: ["soy sauce", "fish sauce", "oyster sauce", "worcestershire", "miso"] },
  { why: "both are hard cheeses", keys: ["parmesan", "parmigiano", "pecorino", "cheddar", "gruyere"] },
  { why: "both are tomato bases", keys: ["tomato", "tomato puree", "tomato paste", "passata"] }
];
var FAMILY_BY_KEY = new Map(FAMILIES.flatMap((f) => f.keys.map((k) => [k, f])));
var substitutesFor = (name) => {
  const key = matchIngredient(name)?.key;
  const family = key ? FAMILY_BY_KEY.get(key) : void 0;
  return family ? { why: family.why, keys: family.keys.filter((k) => k !== key) } : null;
};

// src/lib/api/svg.ts
var INK = "#231B33";
var PAPER = "#F1F3EE";
var CARD = "#F8F8F4";
var RULE = "#D3D8CE";
var MUTED = "#6B6478";
var FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, -apple-system, sans-serif";
var xmlSafe = (ch) => {
  const c = ch.codePointAt(0) ?? 0;
  return c === 9 || c === 10 || c === 13 || c >= 32 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536;
};
var escapeXml = (text) => [...text].filter(xmlSafe).join("").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var ELLIPSIS = String.fromCharCode(8230);
var N = TASTES.length;
var at = (i, value, radius) => {
  const angle = Math.PI * 2 * i / N - Math.PI / 2;
  const r = Math.max(0.4, Math.min(10, value)) / 10 * radius;
  return [Math.cos(angle) * r, Math.sin(angle) * r];
};
var fmt = (n) => (Math.round(n * 10) / 10).toString();
var points = (v2, radius) => v2.map((value, i) => at(i, value, radius).map(fmt).join(",")).join(" ");
var radarGroup = ({ vector, compare, radius, labelSize, showValues }) => {
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${points(TASTES.map(() => f * 10), radius)}" fill="none" stroke="${RULE}" stroke-width="${f === 1 ? 1.5 : 1}"/>`).join("");
  const spokes = TASTES.map((_, i) => {
    const [x, y] = at(i, 10, radius);
    return `<line x1="0" y1="0" x2="${fmt(x)}" y2="${fmt(y)}" stroke="${RULE}" stroke-width="1"/>`;
  }).join("");
  const outline = compare ? `<polygon points="${points(compare, radius)}" fill="none" stroke="${INK}" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="5 4"/>` : "";
  const shape = `<polygon points="${points(vector, radius)}" fill="${INK}" fill-opacity="0.1" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  const dots = TASTES.map((t, i) => {
    const [x, y] = at(i, vector[i], radius);
    return `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(radius * 0.035)}" fill="${t.color}"/>`;
  }).join("");
  const labels = TASTES.map((t, i) => {
    const angle = Math.PI * 2 * i / N - Math.PI / 2;
    const x = Math.cos(angle) * (radius + labelSize * 1.5);
    const y = Math.sin(angle) * (radius + labelSize * 1.5);
    const anchor = Math.abs(x) < 1 ? "middle" : x > 0 ? "start" : "end";
    const value = showValues ? ` <tspan fill="${MUTED}" font-weight="400">${fmt(vector[i])}</tspan>` : "";
    return `<text x="${fmt(x)}" y="${fmt(y + labelSize * 0.35)}" text-anchor="${anchor}" font-size="${labelSize}" font-weight="600" fill="${INK}">${t.label}${value}</text>`;
  }).join("");
  return `${rings}${spokes}${outline}${shape}${dots}${labels}`;
};
var chartSvg = (vector, { title, size = 420 } = {}) => {
  const width = Math.max(240, Math.min(900, Math.round(size)));
  const caption = title?.trim().slice(0, 70);
  const height = caption ? 470 : 430;
  const summary = describeProfile(vector);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 ${height}" width="${width}" height="${Math.round(width * height / 420)}" role="img" font-family="${FONT}">`,
    `<title>${escapeXml(caption ? `${caption}: ` : "")}${escapeXml(summary)}</title>`,
    `<rect width="420" height="${height}" rx="14" fill="${CARD}" stroke="${RULE}"/>`,
    `<g transform="translate(210 205)">${radarGroup({ vector, radius: 104, labelSize: 13, showValues: true })}</g>`,
    caption ? `<text x="210" y="408" text-anchor="middle" font-size="16" font-weight="700" fill="${INK}">${escapeXml(caption)}</text>` : "",
    `<text x="210" y="${height - 22}" text-anchor="middle" font-size="12" fill="${MUTED}">${escapeXml(summary)}. Flavor chart by FlavorCraft</text>`,
    "</svg>"
  ].join("");
};
var wrapTitle = (title, perLine, maxLines) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= perLine || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const cut = lines.slice(0, maxLines).map((l) => l.length > perLine + 4 ? l.slice(0, perLine + 3) + ELLIPSIS : l);
  if (lines.length > maxLines) cut[maxLines - 1] = cut[maxLines - 1].replace(/[.,;:!?]+$/, "") + ELLIPSIS;
  return cut;
};
var shareCardSvg = ({ title, subtitle, change, vector, compare }) => {
  const lines = wrapTitle(title, 17, 3);
  const titleSize = lines.length === 3 ? 62 : 72;
  const top = 250 - (lines.length - 1) * titleSize * 1.08 / 2;
  const titleBlock = lines.map((l, i) => `<text x="72" y="${fmt(top + i * titleSize * 1.08)}" font-size="${titleSize}" font-weight="700" fill="${INK}">${escapeXml(l)}</text>`).join("");
  const below = top + (lines.length - 1) * titleSize * 1.08;
  const total = vector.reduce((a, b) => a + b, 0) || 1;
  let x = 72;
  const band = TASTES.map((t, i) => {
    const w = vector[i] / total * 520;
    const rect = vector[i] > 0.5 ? `<rect x="${fmt(x)}" y="540" width="${fmt(w)}" height="10" fill="${t.color}"/>` : "";
    if (vector[i] > 0.5) x += w;
    return rect;
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" font-family="${FONT}">`,
    `<rect width="1200" height="630" fill="${PAPER}"/>`,
    `<text x="72" y="96" font-size="30" font-weight="700" fill="${INK}">FlavorCraft</text>`,
    titleBlock,
    `<text x="72" y="${fmt(below + 62)}" font-size="30" font-weight="500" fill="${MUTED}">${escapeXml(wrapTitle(subtitle, 40, 1)[0] ?? "")}</text>`,
    change ? `<text x="72" y="${fmt(below + 112)}" font-size="30" font-weight="700" fill="${INK}">${escapeXml(change)}</text>` : "",
    band,
    `<text x="72" y="584" font-size="22" font-weight="500" fill="${MUTED}">${escapeXml(describeProfile(vector))}</text>`,
    `<rect x="672" y="60" width="468" height="510" rx="20" fill="${CARD}" stroke="${RULE}" stroke-width="1.5"/>`,
    `<g transform="translate(906 315)">${radarGroup({ vector, compare, radius: 150, labelSize: 21 })}</g>`,
    "</svg>"
  ].join("");
};

// src/lib/api/engine.ts
var MAX_INGREDIENTS = 60;
var parseIngredients = (input) => {
  const raw = typeof input === "string" ? input.split(/[,\n;]/) : Array.isArray(input) ? input : [];
  if (raw.length > MAX_INGREDIENTS * 2) return null;
  const lines = [];
  for (const item of raw) {
    let name = "";
    let measure = "";
    if (typeof item === "string") {
      const colon = item.indexOf(":");
      name = colon === -1 ? item : item.slice(0, colon);
      measure = colon === -1 ? "" : item.slice(colon + 1);
    } else if (item && typeof item === "object") {
      const o = item;
      name = typeof o.name === "string" ? o.name : "";
      measure = typeof o.measure === "string" ? o.measure : "";
    }
    name = name.trim().slice(0, 80);
    if (name) lines.push({ name, measure: measure.trim().slice(0, 60) });
  }
  return lines.length > 0 && lines.length <= MAX_INGREDIENTS ? lines : null;
};
var profileResponse = (lines) => {
  const profile = computeProfile(lines);
  return {
    summary: describeProfile(profile.vector),
    tastes: TASTES.map((t, i) => ({ key: t.key, label: t.label, value: profile.vector[i], color: t.color, from: profile.sources[i] })),
    vector: profile.vector,
    matched: profile.matched,
    total: profile.total,
    unrecognized: lines.filter((l) => !matchIngredient(l.name)).map((l) => l.name),
    warnings: balanceWarnings(profile).map((w) => ({ label: w.label, suggestion: w.suggestion })),
    note: "Scores run from 0 to 10 and are culinary estimates from a hand-tuned ingredient table, not measurements."
  };
};
var vectorOf = (lines) => computeProfile(lines).vector;
var swapsResponse = (ingredient) => {
  const match = matchIngredient(ingredient);
  const subs = substitutesFor(ingredient);
  return {
    ingredient,
    recognized: Boolean(match),
    swaps: subs ? subs.keys : [],
    why: subs ? subs.why : null
  };
};
var drinksResponse = (lines, alcohol) => ({
  summary: describeProfile(vectorOf(lines)),
  drinks: drinkPairings(vectorOf(lines), { alcohol }).map((p) => ({
    name: p.drink.name,
    style: p.drink.style,
    alcohol: p.drink.alcohol,
    how: p.how,
    reason: p.reason
  }))
});
var remixCard = (remix, original) => {
  const vector = vectorOf(remix.ingredients);
  const compare = original ? vectorOf(original.ingredients) : void 0;
  return shareCardSvg({
    title: remix.title,
    subtitle: original ? `A remix of ${original.title}` : "A FlavorCraft remix",
    change: compare ? changeWords(tasteChanges(compare, vector)) : void 0,
    vector,
    compare
  });
};
var engineFingerprint = () => {
  const sample = [
    KNOWN_INGREDIENTS.map((k) => [k, matchIngredient(k)?.vector]),
    DRINKS.map((d) => [d.name, d.vector, d.body]),
    ORIGINAL_RECIPES.map((r) => [r.id, computeProfile(r.ingredients).vector]),
    computeProfile(parseIngredients("Cr\xE8me fra\xEEche, Jalape\xF1o: 2, soy sauce: 1 tsp, lime, sugar: pinch") ?? []).vector
  ];
  let h = 2166136261;
  for (const ch of JSON.stringify(sample)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
};

// src/lib/api/router.ts
var cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
var HOUR = "public, max-age=3600";
var TEN_MINUTES = "public, max-age=600";
var json = (body, status = 200, cache2 = HOUR) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": status === 200 ? cache2 : "no-store" }
});
var fail = (status, error) => json({ error }, status);
var svg = (body, cache2 = HOUR) => new Response(body, {
  headers: {
    ...cors,
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": cache2,
    "X-Content-Type-Options": "nosniff",
    // An SVG opened directly is a document: make sure it can never run anything.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"
  }
});
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var NEED = "Give 1 to 60 ingredients, e.g. ?ingredients=lime,fish sauce,chilli";
var API_INDEX = {
  name: "FlavorCraft flavor API",
  about: "Flavor profiles are culinary estimates from a hand-tuned ingredient table. Free to use; please cache responses.",
  endpoints: {
    "GET /profile?ingredients=lime,fish sauce,chilli": "Taste profile for a list of ingredients (also POST {ingredients: [...]})",
    "GET /chart.svg?ingredients=...&title=...&size=420": "The profile as an SVG chart, for <img> embeds",
    "GET /swaps?ingredient=butter": "Ingredients that can stand in for one another, and why",
    "GET /drinks?ingredients=...&alcohol=false": "Drinks that balance or echo the dish",
    "GET /remix/{id}": "A public remix with its taste profile",
    "GET /remix/{id}/card.png": "The 1200x630 share image for a public remix (card.svg also works)"
  }
};
var originalOf = async (recipeId, deps) => {
  const own = ORIGINAL_RECIPES.find((r) => r.id === recipeId);
  if (own) return own;
  const mealId = /^mdb-(\d+)$/.exec(recipeId)?.[1];
  if (!mealId) return null;
  try {
    const meal = await deps.fetchMeal(mealId);
    return meal ? normalizeMeal(meal) : null;
  } catch {
    return null;
  }
};
var handleApi = async (req, deps) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return fail(405, "Use GET or POST.");
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/flavor-api/, "").replace(/\/+$/, "") || "/";
  try {
    if (path === "/") return json({ ...API_INDEX, engine: engineFingerprint() });
    const ingredients = async () => {
      if (req.method === "POST") {
        const body = await req.json().catch(() => null);
        return parseIngredients(body?.ingredients);
      }
      return parseIngredients(url.searchParams.get("ingredients") ?? "");
    };
    if (path === "/profile") {
      const lines = await ingredients();
      return lines ? json(profileResponse(lines)) : fail(400, NEED);
    }
    if (path === "/chart.svg") {
      const lines = await ingredients();
      if (!lines) return fail(400, NEED);
      const size = Number(url.searchParams.get("size")) || 420;
      return svg(chartSvg(vectorOf(lines), { title: url.searchParams.get("title") ?? void 0, size }));
    }
    if (path === "/drinks") {
      const lines = await ingredients();
      return lines ? json(drinksResponse(lines, url.searchParams.get("alcohol") !== "false")) : fail(400, NEED);
    }
    if (path === "/swaps") {
      const ingredient = (url.searchParams.get("ingredient") ?? "").trim().slice(0, 80);
      return ingredient ? json(swapsResponse(ingredient)) : fail(400, "Give an ingredient, e.g. ?ingredient=butter");
    }
    const remixRoute = /^\/remix\/([^/]+)(?:\/(card\.png|card\.svg))?$/.exec(path);
    if (remixRoute) {
      const [, id, card] = remixRoute;
      if (!UUID.test(id)) return fail(400, "That isn't a remix id.");
      const remix = await deps.fetchRemix(id);
      if (!remix) return fail(404, "No public remix has that id.");
      const original = await originalOf(remix.parent_recipe_id, deps);
      if (!card) {
        return json(
          {
            id: remix.id,
            title: remix.title,
            note: remix.note ?? "",
            remixOf: original ? { id: remix.parent_recipe_id, title: original.title } : { id: remix.parent_recipe_id },
            removed: remix.removed,
            added: remix.added,
            ingredients: remix.ingredients,
            createdAt: remix.created_at,
            profile: profileResponse(remix.ingredients)
          },
          200,
          TEN_MINUTES
        );
      }
      const markup = remixCard(remix, original);
      if (card === "card.svg") return svg(markup, TEN_MINUTES);
      const png = await deps.toPng(markup);
      return new Response(png, { headers: { ...cors, "Content-Type": "image/png", "Cache-Control": TEN_MINUTES } });
    }
    return fail(404, "No such endpoint. GET / lists them.");
  } catch (err) {
    console.error("flavor-api failed", path, err);
    return fail(500, "Something went wrong computing that. Try again.");
  }
};
export {
  API_INDEX,
  MAX_INGREDIENTS,
  chartSvg,
  drinksResponse,
  engineFingerprint,
  handleApi,
  parseIngredients,
  profileResponse,
  remixCard,
  shareCardSvg,
  swapsResponse,
  vectorOf
};
