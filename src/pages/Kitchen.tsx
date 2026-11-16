import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bookmark, Star, X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import FlavorBand from '@/components/flavor/FlavorBand';
import TasteDots from '@/components/flavor/TasteDots';
import RecipeCard from '@/components/RecipeCard';
import RemixRow from '@/components/kitchen/RemixRow';
import { Household, SeasoningHandCard, TasteTimeline } from '@/components/kitchen/KitchenInsights';
import { useTasteSettings } from '@/lib/kitchen/settings';
import AuthDialog from '@/components/kitchen/AuthDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCatalog } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { accountsEnabled } from '@/lib/supabase';
import { useKitchen } from '@/lib/kitchen/store';
import { buildTasteProfile, catalogAverage, matchReason, recommend, standouts } from '@/lib/kitchen/tasteProfile';
import { ORIGINAL_RECIPES } from '@/lib/recipes/originals';
import { PROBLEMS } from '@/lib/flavor/fixes';
import { describeProfile } from '@/lib/flavor/tastes';
import { leftoverCandidates } from '@/lib/cook/leftovers';
import type { ProfiledRecipe } from '@/lib/recipes/types';
import { cn } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeepProfileFresh } from '@/hooks/useCommunity';

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** First-visit picker: tap dishes that sound good to seed the taste profile. */
const StarterPicker = ({ recipes }: { recipes: ProfiledRecipe[] }) => {
  const saved = useKitchen((s) => s.saved);
  const toggleSave = useKitchen((s) => s.toggleSave);
  const savedIds = new Set(saved.map((s) => s.recipeId));

  return (
    <section className="mt-10" aria-labelledby="starter-title">
      <h2 id="starter-title" className="text-2xl font-bold">Start with a few dishes that sound good</h2>
      <p className="mt-1 max-w-xl text-muted-foreground">
        Each one you save shapes your taste profile. Three is enough for useful suggestions.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recipes.map((r) => {
          const on = savedIds.has(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggleSave(r.id)}
                className={cn(
                  'flex h-full w-full flex-col rounded-lg border p-4 text-left transition-colors',
                  on ? 'border-foreground bg-card' : 'hover:bg-card',
                )}
              >
                <FlavorBand values={r.flavor.vector} />
                <span className="mt-3 font-semibold leading-snug">{r.title}</span>
                <span className="mt-1 text-sm text-muted-foreground">{r.summary}</span>
                <span className="mt-3"><TasteDots values={r.flavor.vector} /></span>
                <span className={cn('mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium', !on && 'text-muted-foreground')}>
                  <Bookmark className={cn('h-4 w-4', on && 'fill-current')} aria-hidden />
                  {on ? 'Saved' : 'Save'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const Kitchen = () => {
  useDocumentTitle('My Kitchen');
  useKeepProfileFresh();
  const { data } = useCatalog();
  const { saved, remixes, cooks, removeCook } = useKitchen();
  const user = useAuth((s) => s.user);
  const syncing = useAuth((s) => s.syncing);
  const [authOpen, setAuthOpen] = useState(false);

  const byId = useMemo(() => new Map((data?.recipes ?? []).map((r) => [r.id, r])), [data]);
  const quiz = useTasteSettings((s) => s.quiz);
  const kitchen = useMemo(() => ({ saved, remixes, cooks }), [saved, remixes, cooks]);
  const profile = useMemo(() => buildTasteProfile(kitchen, byId, quiz?.vector), [kitchen, byId, quiz]);
  const average = useMemo(() => (data ? catalogAverage(data.recipes) : null), [data]);
  const picks = useMemo(() => {
    if (!profile || !data) return [];
    const exclude = new Set([...saved.map((s) => s.recipeId), ...cooks.map((c) => c.recipeId)]);
    return recommend(profile.vector, data.recipes, exclude, 4);
  }, [profile, data, saved, cooks]);
  const triedIds = useMemo(() => new Set([...saved.map((s) => s.recipeId), ...cooks.map((c) => c.recipeId)]), [saved, cooks]);
  const starters = useMemo(() => ORIGINAL_RECIPES.map((r) => byId.get(r.id)).filter((r): r is ProfiledRecipe => Boolean(r)), [byId]);

  const remixTitle = (id: string | null) => (id ? remixes.find((r) => r.id === id)?.title : undefined);
  const problemLabel = (id: string) => PROBLEMS.find((p) => p.id === id)?.label ?? id;

  // Best-rated things you've made, newest first, one entry per dish.
  const cookAgain = useMemo(() => {
    const seen = new Set<string>();
    return cooks
      .filter((c) => (c.rating ?? 0) >= 4)
      .filter((c) => {
        const key = c.remixId ?? c.recipeId;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }, [cooks]);

  const savedRecipes = saved.map((s) => byId.get(s.recipeId)).filter((r): r is ProfiledRecipe => Boolean(r));
  // Only the most recent cooks: last month's coriander is long gone.
  const withLeftovers = useMemo(() => {
    const cutoff = Date.now() - 5 * 24 * 3600 * 1000;
    return new Set(
      cooks
        .filter((c) => new Date(c.cookedAt).getTime() >= cutoff)
        .map((c) => c.recipeId)
        .filter((rid) => {
          const r = byId.get(rid);
          return r ? leftoverCandidates(r).length > 0 : false;
        }),
    );
  }, [cooks, byId]);
  const isNew = saved.length + cooks.length + remixes.length === 0;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const cookedThisMonth = cooks.filter((c) => new Date(c.cookedAt).getTime() >= monthStart).length;

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">My Kitchen</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          {isNew
            ? 'Your saved recipes, remixes and cooking log live here, and together they learn what you like to eat.'
            : `${plural(saved.length, 'saved recipe')}, ${plural(remixes.length, 'remix', 'remixes')}, and ${plural(cooks.length, 'dish', 'dishes')} cooked${
                cookedThisMonth ? `, ${cookedThisMonth} of them this month` : ''
              }.`}
        </p>

        {accountsEnabled && !user && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <p className="text-sm">Your kitchen is saved in this browser only. Sign in to keep it across devices and share remixes.</p>
            <Button size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
          </div>
        )}
        <p className="mt-4 text-sm">
          <Link to="/pantry" className="font-medium underline underline-offset-2">Cook with what you have</Link>
          <span className="text-muted-foreground">: find recipes that fit your pantry.</span>
        </p>
        <p className="mt-1 text-sm">
          <Link to="/photo" className="font-medium underline underline-offset-2">Taste a photo</Link>
          <span className="text-muted-foreground">: chart a restaurant dish and find recipes that taste like it.</span>
        </p>
        {accountsEnabled && (
          <p className="mt-1 text-sm">
            <Link to="/community" className="font-medium underline underline-offset-2">Community</Link>
            <span className="text-muted-foreground">: this week’s remix challenge, and cooks with your taste.</span>
          </p>
        )}
        {syncing && <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">Loading your kitchen from your account…</p>}

        {isNew && !quiz && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-foreground px-6 py-5 text-background">
            <div>
              <p className="text-lg font-semibold">Take the 60-second taste quiz</p>
              <p className="text-sm text-background/75">Eight quick “which would you rather eat?” choices, and your suggestions are ready.</p>
            </div>
            <Button asChild variant="secondary"><Link to="/quiz">Start the quiz</Link></Button>
          </div>
        )}
        {isNew && starters.length > 0 && <StarterPicker recipes={starters} />}

        {profile && (
          <section className="mt-10 grid gap-10 lg:grid-cols-[380px_1fr]" aria-labelledby="profile-title">
            <div className="rounded-xl border bg-card p-5">
              <h2 id="profile-title" className="text-lg font-semibold">Your taste profile</h2>
              <p className="text-sm text-muted-foreground">
                {describeProfile(profile.vector)}.{' '}
                {profile.basedOn === 0 ? 'Based on your taste quiz so far.' : `Based on ${plural(profile.basedOn, 'recipe')} you saved or cooked.`}
              </p>
              <div className="mt-2 flex justify-center">
                <FlavorRadar values={profile.vector} compare={average ?? undefined} compareLabel="the average recipe" size={280} />
              </div>
              {average && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                  Average recipe
                </p>
              )}
              {average && standouts(profile.vector, average).length > 0 && (
                <ul className="mt-4 space-y-1 border-t pt-4 text-sm">
                  {standouts(profile.vector, average).map((s) => <li key={s}>{s}</li>)}
                </ul>
              )}
              {profile.adjustments.map((a) => (
                <p key={a} className="mt-2 text-sm text-muted-foreground">{a}</p>
              ))}
              {profile.fromQuiz && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Includes your taste quiz. <Link to="/quiz" className="underline underline-offset-2">Retake it</Link>
                </p>
              )}
              {profile.basedOn < 3 && (
                <p className="mt-3 text-sm text-muted-foreground">Save or cook a couple more dishes to sharpen this.</p>
              )}
            </div>

            <div className="space-y-12">
              <div>
                <h2 className="text-2xl font-bold">Cook next</h2>
                <p className="mt-1 text-sm text-muted-foreground">Closest to your profile, and new to you.</p>
                <ul className="mt-4 space-y-5">
                  {!data && <li className="h-24 animate-pulse rounded-md bg-muted" />}
                  {picks.map((r) => (
                    <li key={r.id}>
                      <RecipeCard recipe={r} layout="row" />
                      <p className="mt-1 pl-[112px] text-sm text-muted-foreground sm:pl-[156px]">{matchReason(profile.vector, r.flavor.vector)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {cookAgain.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold">Worth making again</h2>
                  <ul className="mt-3 divide-y border-y">
                    {cookAgain.map((c) => {
                      const title = remixTitle(c.remixId) ?? byId.get(c.recipeId)?.title ?? 'A recipe no longer in the catalog';
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                          <Link to={c.remixId ? `/remixes/${c.remixId}` : `/recipes/${c.recipeId}`} className="font-medium hover:underline hover:underline-offset-4">
                            {title}
                          </Link>
                          <span className="flex items-center gap-1 text-sm" aria-label={`Rated ${c.rating} out of 5`}>
                            <Star className="h-4 w-4 fill-current" aria-hidden /> {c.rating}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {data && (
          <div className="mt-14 space-y-14">
            <TasteTimeline kitchen={kitchen} byId={byId} />
            <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
              <Household me={profile?.vector ?? null} recipes={data.recipes} exclude={triedIds} />
              <SeasoningHandCard kitchen={kitchen} />
            </div>
          </div>
        )}

        {!isNew && (
          <Tabs defaultValue="saved" className="mt-14">
            <TabsList>
              <TabsTrigger value="saved">Saved ({saved.length})</TabsTrigger>
              <TabsTrigger value="remixes">Remixes ({remixes.length})</TabsTrigger>
              <TabsTrigger value="cooked">Cooked ({cooks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="mt-6">
              {savedRecipes.length ? (
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {savedRecipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
                </div>
              ) : (
                <p className="text-muted-foreground">{saved.length && !data ? 'Loading recipes…' : 'No saved recipes yet. Use Save recipe on any recipe page.'}</p>
              )}
            </TabsContent>

            <TabsContent value="remixes" className="mt-6">
              {remixes.length ? (
                <ul className="divide-y border-y">
                  {[...remixes].reverse().map((r) => (
                    <li key={r.id}><RemixRow remix={r} mine /></li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed px-6 py-8">
                  <p className="font-medium">No remixes yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Open a recipe, untick or swap an ingredient, and choose Save remix. The chart shows how your version differs.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cooked" className="mt-6">
              {cooks.length ? (
                <ul className="divide-y border-y">
                  {cooks.map((c) => {
                    const title = remixTitle(c.remixId) ?? byId.get(c.recipeId)?.title ?? 'A recipe no longer in the catalog';
                    const to = c.remixId ? `/remixes/${c.remixId}` : `/recipes/${c.recipeId}`;
                    return (
                      <li key={c.id} className="flex items-start gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3">
                            <Link to={to} className="font-medium hover:underline hover:underline-offset-4">{title}</Link>
                            <span className="text-sm text-muted-foreground">{dateFormat.format(new Date(c.cookedAt))}</span>
                            {c.rating && <span className="text-sm">{c.rating}/5</span>}
                          </div>
                          {c.problems.length > 0 && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{c.problems.map(problemLabel).join(', ')}</p>
                          )}
                          {c.note && <p className="mt-1 text-sm">{c.note}</p>}
                          {withLeftovers.has(c.recipeId) && (
                            <Link to={`/leftovers?from=${c.recipeId}`} className="mt-1 inline-block text-sm underline underline-offset-2">
                              Use up what’s left
                            </Link>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeCook(c.id);
                            toast.success('Removed from your cooking log');
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${title} from your cooking log`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed px-6 py-8">
                  <p className="font-medium">Nothing cooked yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    After you make something, choose I cooked this, or finish in cook mode. Ratings sharpen your suggestions.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Kitchen;
