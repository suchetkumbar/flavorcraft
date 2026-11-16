// FlavorCraft public API: flavor profiles, embeddable charts, swaps, drink pairings and
// share images for public remixes. No sign-in, no AI.
//
// All the logic lives in engine.js, which is generated from src/lib/api by
// `npm run build:engine` (so the API and the app compute the same numbers, and the
// request handling is covered by the app's tests). This file only supplies what
// needs a network or a renderer.
//
// Deploy: npm run build:engine && npx supabase functions deploy flavor-api --no-verify-jwt
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { handleApi } from "./engine.js";

/** A remix by id, as an anonymous visitor: row-level security only returns public ones. */
const fetchRemix = async (id: string) => {
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const res = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/remixes?id=eq.${id}&is_public=eq.true&select=id,title,note,parent_recipe_id,ingredients,removed,added,created_at&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`remix lookup failed: ${res.status}`);
  return (await res.json())[0] ?? null;
};

const fetchMeal = async (mealId: string) => {
  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`, { signal: AbortSignal.timeout(4000) });
  return ((await res.json()) as { meals: unknown[] | null }).meals?.[0] ?? null;
};

// The share image is drawn as SVG and turned into a PNG here. The renderer and
// the app's typeface are fetched once per warm instance.
const FONT_URLS = [
  "https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-700-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-500-normal.ttf",
];
let renderer: Promise<Uint8Array[]> | null = null;
const prepareRenderer = () => {
  renderer ??= (async () => {
    await initWasm(fetch("https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
    return Promise.all(
      FONT_URLS.map(async (url) => {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`font ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      }),
    );
  })().catch((err) => {
    renderer = null; // try again on the next request
    throw err;
  });
  return renderer;
};

const toPng = async (markup: string): Promise<Uint8Array> => {
  const fontBuffers = await prepareRenderer();
  const resvg = new Resvg(markup, {
    fitTo: { mode: "width", value: 1200 },
    font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Bricolage Grotesque" },
  });
  return resvg.render().asPng();
};

Deno.serve((req) => handleApi(req, { fetchRemix, fetchMeal, toPng }));
