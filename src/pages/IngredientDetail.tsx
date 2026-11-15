import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import RecipeCard from '@/components/RecipeCard';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buildPairingIndex, canonicalName, pairingsFor } from '@/lib/flavor/pairings';
import { ingredientFromSlug, ingredientProfile, ingredientSlug, starRecipes } from '@/lib/flavor/ingredientInfo';
import { substitutesFor } from '@/lib/pantry/match';
import { TASTES, describeProfile } from '@/lib/flavor/tastes';

const IngredientDetail = () => {
  const { slug = '' } = useParams();
  const name = canonicalName(ingredientFromSlug(slug));
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  useDocumentTitle(title || 'Ingredient');
  const { data, isLoading } = useCatalog();

  const profile = ingredientProfile(name);
  const subs = substitutesFor(name);
  const info = useMemo(() => {
    if (!data) return null;
    const index = buildPairingIndex(data.recipes);
    const usedIn = index.byIngredient.get(name);
    const stars = starRecipes(data.recipes, name, 6);
    const fallback = stars.length ? [] : data.recipes.filter((r) => usedIn?.has(r.id)).slice(0, 6);
    return { usedIn: usedIn?.size ?? 0, partners: pairingsFor(index, name, 16), stars, fallback };
  }, [data, name]);

  const brings = profile
    ? TASTES.map((t, i) => ({ ...t, v: profile.vector[i] })).filter((t) => t.v >= 4).sort((a, b) => b.v - a.v)
    : [];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/ingredients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All ingredients
        </Link>
        <h1 className="mt-6 text-4xl font-bold capitalize sm:text-5xl">{name}</h1>
        <p className="mt-2 text-muted-foreground">
          {isLoading ? 'Counting recipes…' : info?.usedIn ? `Used in ${info.usedIn} recipes.` : 'Not used in any recipe in the catalog yet.'}
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">What it brings</h2>
            {profile ? (
              <>
                <p className="text-sm text-muted-foreground">{describeProfile(profile.vector)}.</p>
                <div className="mt-2 flex justify-center">
                  <FlavorRadar values={profile.vector} size={260} />
                </div>
                <ul className="mt-3 space-y-1.5 border-t pt-3 text-sm">
                  {brings.map((t) => (
                    <li key={t.key} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
                      <span className="font-medium">{t.label}</span>
                      <span className="tabular-nums text-muted-foreground">{t.v}/10</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                FlavorCraft doesn’t have a taste profile for this ingredient yet, so it doesn’t change recipe charts.
              </p>
            )}
            {subs && (
              <div className="mt-5 border-t pt-4">
                <h3 className="text-sm font-semibold">Can swap with</h3>
                <p className="text-sm text-muted-foreground">These {subs.why.replace(/^both /, '')}.</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {subs.keys.slice(0, 8).map((k) => (
                    <li key={k}>
                      <Link to={`/ingredients/${ingredientSlug(k)}`} className="rounded-full border px-2.5 py-0.5 text-sm capitalize hover:bg-muted">{k}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          <div className="min-w-0 space-y-12">
            {info && info.partners.length > 0 && (
              <section aria-labelledby="partners">
                <h2 id="partners" className="text-2xl font-bold">Goes well with</h2>
                <p className="mt-1 text-sm text-muted-foreground">What cooks most often combine it with, strongest first.</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {info.partners.map((p) => (
                    <li key={p.name}>
                      <Link
                        to={`/ingredients/${ingredientSlug(p.name)}`}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm capitalize hover:bg-muted"
                      >
                        {p.taste >= 0 && <span className="h-2 w-2 rounded-full" style={{ background: TASTES[p.taste].color }} aria-hidden />}
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm">
                  <Link to={`/pairings?a=${encodeURIComponent(name)}#connect`} className="font-medium underline underline-offset-2">
                    Find what connects {name} to another ingredient
                  </Link>
                </p>
              </section>
            )}

            {info && (info.stars.length > 0 || info.fallback.length > 0) && (
              <section aria-labelledby="dishes">
                <h2 id="dishes" className="text-2xl font-bold">{info.stars.length ? 'Where it’s the star' : 'Recipes using it'}</h2>
                {info.stars.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dishes where {name} is the main source of their {brings[0]?.label.toLowerCase() ?? 'flavor'}.
                  </p>
                )}
                <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                  {(info.stars.length ? info.stars : info.fallback).map((r) => <RecipeCard key={r.id} recipe={r} />)}
                </div>
                {info.usedIn > 6 && (
                  <p className="mt-6 text-sm">
                    <Link to={`/recipes?q=${encodeURIComponent(name)}`} className="underline underline-offset-2">See all {info.usedIn} recipes with {name}</Link>
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default IngredientDetail;
