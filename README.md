# FlavorCraft

Find recipes by how they taste. FlavorCraft gives every recipe a flavor profile across eight
tastes (sweet, salty, sour, bitter, umami, heat, richness, aroma) and builds tools on top of it.

## What it does

- **Cook by taste**: set eight sliders and get the dishes closest to that balance.
- **Flavor profiles**: each recipe gets a radar chart, with the ingredients behind each taste.
- **Remix**: uncheck or add ingredients and watch the profile change against the original.
- **Fix my dish**: choose what's wrong (flat, too salty, too heavy…) and get fixes ranked for that
  recipe, with amounts, the reason each works, and a preview on the chart.
- **Pairings**: pick an ingredient and see what cooks combine it with across the catalog,
  grouped by the taste each partner adds.
- **My Kitchen**: save recipes, save remixes as forks (with a "forked from" family tree), and log
  what you cooked with a rating and what was off. These build a personal taste profile that picks
  what to cook next, and leans away from problems you keep logging.
- **Kitchen assistant** (signed-in users): ask for swaps for any ingredient ("dairy-free", "don't
  have it") and apply one straight into a remix, or get "Fix my dish" advice for the exact recipe.
  Runs on Gemini Flash through a Supabase Edge Function, limited to 40 requests per user per day.
- **Cook mode**: one step at a time in large type, an ingredient checklist, timers detected from
  the step text, and the screen kept awake. Logs the cook when you finish.

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
- **Pairings** are computed from ingredient co-occurrence across the catalog, normalized so
  ubiquitous ingredients like onion don't dominate.

## Tech stack

- Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- TanStack Query for loading and caching the catalog
- Supabase (Postgres + Auth) for accounts and syncing My Kitchen, with row-level security
- Zustand for the local-first kitchen store
- Gemini Flash (`gemini-3.8-flash`) via the Google Gen AI SDK in a Supabase Edge Function for the kitchen assistant

> Using TheMealDB in production: the test key is for development and education. A public
> launch should use a [paid TheMealDB key](https://www.themealdb.com/api.php).

## Quick start

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and publishable key, or leave empty
npm run dev                  # http://localhost:8080
```

Accounts need a Supabase project with the migrations in `supabase/migrations/` applied and
`http://localhost:8080` allowed as a redirect URL. `SETUP_GUIDE.md` walks through it.

## Project structure

```
src/
├── pages/            # Index, Recipes, RecipeDetail, RemixDetail, Pairings, Kitchen, CookMode, NotFound
├── components/
│   ├── flavor/       # FlavorRadar, FlavorBand, TasteDots
│   ├── kitchen/      # AuthDialog, CookDialog, SaveRemixDialog, RemixRow, SwapPanel, AiFixPanel
│   └── ui/           # shadcn/ui primitives (only the ones in use)
├── hooks/            # useRecipes (catalog), useRemixes, useAuth
└── lib/
    ├── flavor/       # tastes, ingredient table, profile, fixes, pairings
    ├── recipes/      # TheMealDB client, originals, types
    ├── kitchen/      # local-first store, Supabase data access, taste profile
    └── supabase.ts   # client (null when env vars are missing)
supabase/migrations/  # database schema and RLS policies
supabase/functions/kitchen-assistant/  # Gemini-powered swaps and fixes (Deno)
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

## License

MIT
