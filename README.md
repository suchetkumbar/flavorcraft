# FlavorCraft

Find recipes by how they taste. FlavorCraft gives every recipe a flavor profile across eight
tastes (sweet, salty, sour, bitter, umami, heat, richness, aroma) and builds tools on top of it.

## What it does

- **Cook by taste**: set eight sliders and get the dishes closest to that balance.
- **Flavor profiles**: each recipe gets a radar chart, with the ingredients behind each taste.
- **Remix**: uncheck or add ingredients and watch the profile change against the original. Unsaved
  edits are kept as a draft on your device and restored when you come back.
- **Balance warnings**: recipes that lean hard one way with nothing to balance it ("Rich with no
  acid", "Hot with nothing to cool it") are flagged, with a suggestion and a link to the matching fix.
  Desserts are deliberately left alone.
- **Compare** (`/compare`): two dishes on one chart, a similarity score, and plain sentences on
  what makes them differ ("Tamarind Prawns is hotter, from the red chilli").
- **Scaling**: make ½× to 3× a recipe. Salt, spices, chilli, acids and salty sauces scale by
  factor^0.75 when making more, so a double batch isn't over-seasoned; whole items round sensibly.
- **Ingredient pages** (`/ingredients`): what each ingredient brings, what can replace it, what it
  pairs with, and the dishes where it's the star.
- **Flavor bridges**: on Pairings, enter two ingredients to find what cooks combine with both.
- **Taste quiz** (`/quiz`): eight "which would you rather eat?" choices between real dishes that
  differ mainly in one taste. Seeds your taste profile, so suggestions work from the first visit.
- **Cooking for others**: add the people you cook for (each takes the quiz on your device) and get
  dishes ranked so the least keen person is still happy, not by the average.
- **Your seasoning hand**: learned from your cooking log and remixes ("you usually want more acid");
  "Adjust to my taste" applies it to recipe amounts (at most ±30%).
- **Taste over time**: your profile by month or quarter, with how it has moved.
- **Fix my dish**: choose what's wrong (flat, too salty, too heavy…) and get fixes ranked for that
  recipe, with amounts, the reason each works, and a preview on the chart.
- **Pairings**: pick an ingredient and see what cooks combine it with across the catalog,
  grouped by the taste each partner adds.
- **My Kitchen**: save recipes, save remixes as forks (with a "forked from" family tree), and log
  what you cooked with a rating and what was off. These build a personal taste profile that picks
  what to cook next, and leans away from problems you keep logging.
- **Kitchen assistant** (signed-in users): ask for swaps for any ingredient ("dairy-free", "don't
  have it") and apply one straight into a remix, or get "Fix my dish" advice for the exact recipe.
  Runs on Gemini Flash through a Supabase Edge Function, limited to 40 requests per user per day
  (shared with the photo and "taste like" features).
- **Cook with what you have** (`/pantry`): list what's in your kitchen and get recipes ranked by
  how few ingredients you're missing, with swaps from your own pantry (lemon for lime, butter for
  olive oil) drawn from curated substitution families. Your pantry syncs to your account when signed in.
- **Cook mode**: one step at a time in large type, an ingredient checklist, timers detected from
  the method ("simmer 30 minutes"), and a screen that stays awake.
- **Taste checkpoints**: cook mode asks you to taste at the moments it still helps (where the recipe
  says to, after a long simmer, before serving). Pick what's off and the fix appears on the spot;
  what you noticed is pre-ticked in the cooking log, so your seasoning hand keeps learning.
- **Hands-free cooking**: "Read aloud" speaks each step, and "Voice control" understands "next",
  "back", "repeat" and "start timer". Uses the browser's own speech features; nothing is recorded
  by FlavorCraft.
- **Serve it with / Cook both together**: recipe pages suggest sides that balance the dish (sharp
  next to rich, cool next to hot). `/cook/:id?with=<id>` merges two recipes into one order of
  steps, fitting the quick dish into the other's simmering time so both finish together.
- **Use up what's left** (`/leftovers?from=<id>`): after cooking, see which recipes use the fresh
  ingredients you probably have left, ranked so tomorrow doesn't taste like tonight.
- **Remix family tree**: every recipe and remix page draws its forks as a tree, each branch colored
  by the taste that fork changed most, so you can see where a recipe's family went sour, hot or rich.
- **Weekly remix challenge** (`/challenge`): one prompt a week ("Brighter, without citrus") on one
  recipe. The flavor engine checks each entry against the brief; votes decide between those that pass.
- **Taste twins** (`/community`, `/people/:handle`): opt in to share your taste profile, and find
  cooks whose palate is closest to yours, the dishes they rate, and their remixes. Follow them.
- **Crowd-tuned flavor table**: when dishes containing an ingredient are logged "too salty" (or sweet,
  sour, bitter, spicy, heavy) clearly more often than usual, that ingredient's score is raised for
  everyone. Uses anonymous counts only; ingredient pages show any correction and the evidence for it.
- **Make it taste like…**: on any recipe, name a dish or cuisine ("Thai", "carbonara") and get up to
  four changes that move the recipe toward it, with a closeness score before and after. Cuisines
  and dishes in the catalog are answered without AI; for anything else the assistant names the
  dish's ingredients and the plan is computed from those.
- **Taste a photo** (`/photo`): photograph a restaurant dish. The assistant names what's in it, the
  flavor engine charts it, and you get the recipes that taste closest. You can correct the
  ingredient list, or skip the photo and type it.
- **Pantry from a photo**: photograph your fridge or shopping on the pantry page, review what was
  spotted, and add it.
- **Drink with it**: every recipe gets two drinks that balance it and one that echoes it, chosen by
  rule from its taste profile (acid against richness, sweetness against heat), with a no-alcohol switch.
- **Works offline**: after one visit the whole app opens with no connection, including the recipe
  catalog, your kitchen and cook mode. Signed in, what you save or log offline is queued and sent to
  your account when the connection returns. It can be installed to a phone's home screen.
- **Share images per remix**: a public remix link posted in a chat or on social media shows that
  remix's own name, changes and flavor chart, not the site's generic preview.
- **Embed a flavor chart** (`/developers`): food bloggers paste an ingredient list and copy one
  `<img>` line; their readers see the dish's flavor chart. No scripts, no account.
- **Public API**: taste profiles, charts, swaps and drink pairings over plain HTTP with no key,
  computed by the same engine as the app.

## How it works

- **Recipes** come from the free [TheMealDB](https://www.themealdb.com/api.php) API (no key
  needed; the app uses the documented test key `1`) plus eight FlavorCraft originals in
  `src/lib/recipes/originals.ts`. The catalog is cached in `localStorage` for 24 hours. If
  TheMealDB is unreachable, the app falls back to the originals and says so.
- **Flavor profiles** are computed in the browser from a hand-tuned ingredient table
  (`src/lib/flavor/ingredients.ts`, about 290 entries, covering ~94% of TheMealDB ingredient
  lines). Each taste uses diminishing returns, so the strongest ingredient counts most. These
  are culinary estimates, not lab data.
- **My Kitchen is local-first.** Everything is saved in the browser immediately. When you sign
  in (email link, no password), anything saved on that device is uploaded and your account's
  kitchen is loaded; after that, changes are mirrored to Supabase. Without Supabase env vars,
  the app runs without accounts.
- **Community data is opt-in.** A public profile exists only if you create one (name, handle, taste
  chart, up to 12 liked dishes) and is deleted when you stop sharing. Follows and votes are private.
  The weekly challenge isn't stored: it is derived from the week number and the catalog, so only
  entries and votes live in the database.
- **The AI only names ingredients.** For photos and unknown dishes, Gemini Flash returns ingredient
  names; every number on a chart still comes from the flavor table. Photos are shrunk to 1024px in
  the browser, sent through the Edge Function, and not stored by FlavorCraft.
- **Offline** is a small hand-written service worker (`public/sw.js`). The build fills in the list
  of files to store. Recipe photos you haven't seen, the assistant and Community need a connection.
- **The public API** is the Supabase function `flavor-api`. Its logic is `src/lib/api/`, bundled into
  the function by `npm run build:engine`, so the API and the app cannot drift apart; a test fails
  if the bundle is stale. Link previews for remixes come from the Vercel function `api/share.ts`,
  which `vercel.json` routes crawlers to.
- **Pairings** are computed from ingredient co-occurrence across the catalog, normalized so
  ubiquitous ingredients like onion don't dominate.

## Tech stack

- Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- TanStack Query for loading and caching the catalog
- Supabase (Postgres + Auth) for accounts and syncing My Kitchen, with row-level security
- Zustand for the local-first kitchen store
- Vitest for unit tests
- Gemini Flash (`gemini-3.8-flash`) via the Google Gen AI SDK in a Supabase Edge Function for the kitchen assistant

> Using TheMealDB in production: the test key is for development and education. A public
> launch should use a [paid TheMealDB key](https://www.themealdb.com/api.php).

## Quick start

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and publishable key, or leave empty
npm run dev                  # http://localhost:8080
```

The public API, embeddable charts and remix share images need the `flavor-api` function deployed
(once, and again whenever `src/lib/flavor` or `src/lib/api` changes):

```bash
npm run build:engine
npx supabase functions deploy flavor-api --no-verify-jwt
```

Accounts need a Supabase project with the migrations in `supabase/migrations/` applied and
`http://localhost:8080` allowed as a redirect URL. `SETUP_GUIDE.md` walks through it.

## Project structure

```
src/
├── pages/            # Index, Recipes, RecipeDetail, RemixDetail, Pairings, Kitchen, CookMode, Community, Challenge, Person, …
├── components/
│   ├── flavor/       # FlavorRadar, FlavorBand, TasteDots
│   ├── kitchen/      # AuthDialog, CookDialog, SaveRemixDialog, RemixRow, SwapPanel, AiFixPanel
│   ├── community/    # RemixTree, ProfileDialog, FollowButton
│   └── ui/           # shadcn/ui primitives (only the ones in use)
├── hooks/            # useRecipes (catalog), useRemixes, useAuth
└── lib/
    ├── flavor/       # tastes, ingredient table, profile, fixes, pairings
    ├── recipes/      # TheMealDB client, originals, types
    ├── kitchen/      # local-first store, Supabase data access, taste profile
    ├── community/    # family tree layout, challenges, taste twins, crowd tuning
    └── supabase.ts   # client (null when env vars are missing)
supabase/migrations/  # database schema and RLS policies
supabase/functions/kitchen-assistant/  # Gemini-powered swaps, fixes and photo reading (Deno)
supabase/functions/flavor-api/         # public API, embeddable charts, remix share images (Deno)
api/share.ts                           # Vercel function: link previews for remixes
public/sw.js                           # service worker for offline use
```

## Design

- Base: porcelain `#F1F3EE`, aubergine ink `#231B33`, rules `#D3D8CE`
- Accents: only the eight taste colors, defined in `src/lib/flavor/tastes.ts`
- Type: Bricolage Grotesque (condensed widths for headlines)
- Icon: `public/favicon.svg`, the same eight-wedge mark as `src/components/Logo.tsx`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run build:engine` | Rebuild the flavor engine bundled into the `flavor-api` function |

## License

MIT
