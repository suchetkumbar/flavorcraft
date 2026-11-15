import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import RecipeCard from '@/components/RecipeCard';
import RemixRow from '@/components/kitchen/RemixRow';
import AuthDialog from '@/components/kitchen/AuthDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCatalog } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { accountsEnabled } from '@/lib/supabase';
import { useKitchen } from '@/lib/kitchen/store';
import { buildTasteProfile, recommend } from '@/lib/kitchen/tasteProfile';
import { PROBLEMS } from '@/lib/flavor/fixes';
import { describeProfile } from '@/lib/flavor/tastes';

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const Kitchen = () => {
  const { data } = useCatalog();
  const { saved, remixes, cooks, removeCook } = useKitchen();
  const user = useAuth((s) => s.user);
  const syncing = useAuth((s) => s.syncing);
  const [authOpen, setAuthOpen] = useState(false);

  const byId = useMemo(() => new Map((data?.recipes ?? []).map((r) => [r.id, r])), [data]);
  const profile = useMemo(() => buildTasteProfile({ saved, remixes, cooks }, byId), [saved, remixes, cooks, byId]);
  const picks = useMemo(() => {
    if (!profile || !data) return [];
    const exclude = new Set([...saved.map((s) => s.recipeId), ...cooks.map((c) => c.recipeId)]);
    return recommend(profile.vector, data.recipes, exclude, 4);
  }, [profile, data, saved, cooks]);

  const savedRecipes = saved.map((s) => byId.get(s.recipeId)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  const remixTitle = (id: string | null) => (id ? remixes.find((r) => r.id === id)?.title : undefined);
  const problemLabel = (id: string) => PROBLEMS.find((p) => p.id === id)?.label ?? id;

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">My Kitchen</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Your saved recipes, remixes and cooking log. Together they build a taste profile that picks what to cook next.
        </p>

        {accountsEnabled && !user && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <p className="text-sm">Your kitchen is saved in this browser only. Sign in to keep it across devices and share remixes.</p>
            <Button size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
          </div>
        )}
        {syncing && <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">Loading your kitchen from your account…</p>}

        <section className="mt-10 grid gap-10 lg:grid-cols-[360px_1fr]" aria-labelledby="profile-title">
          <div className="rounded-lg border bg-card p-5">
            <h2 id="profile-title" className="text-lg font-semibold">Your taste profile</h2>
            {profile ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {describeProfile(profile.vector)}. Based on {profile.basedOn} {profile.basedOn === 1 ? 'recipe' : 'recipes'} you saved or cooked.
                </p>
                <div className="mt-2 flex justify-center">
                  <FlavorRadar values={profile.vector} size={280} />
                </div>
                {profile.adjustments.map((a) => (
                  <p key={a} className="mt-2 text-sm text-muted-foreground">{a}</p>
                ))}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Save or cook a few recipes and your profile will appear here.
              </p>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Cook next</h2>
            {profile ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">Dishes closest to your profile that you haven't saved or cooked.</p>
                <div className="mt-4 space-y-4">
                  {picks.map((r) => <RecipeCard key={r.id} recipe={r} layout="row" />)}
                  {!data && <div className="h-24 animate-pulse rounded-md bg-muted" />}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed px-6 py-10">
                <p className="font-medium">Suggestions start after your first save.</p>
                <p className="mt-1 text-sm text-muted-foreground">Open any recipe and choose Save recipe or I cooked this.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/recipes">Browse recipes</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

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
              <p className="text-muted-foreground">No remixes yet. Change the ingredients on any recipe and choose Save remix.</p>
            )}
          </TabsContent>

          <TabsContent value="cooked" className="mt-6">
            {cooks.length ? (
              <ul className="divide-y border-y">
                {cooks.map((c) => {
                  const recipe = byId.get(c.recipeId);
                  const title = remixTitle(c.remixId) ?? recipe?.title ?? 'A recipe no longer in the catalog';
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
              <p className="text-muted-foreground">Nothing logged yet. Choose I cooked this on a recipe after you make it.</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Kitchen;
