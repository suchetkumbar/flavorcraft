import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ChefHat, CookingPot, GitFork, Link2, Trash2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import CookDialog from '@/components/kitchen/CookDialog';
import RemixRow from '@/components/kitchen/RemixRow';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRecipe } from '@/hooks/useRecipes';
import { useRemix, useRemixChildren } from '@/hooks/useRemixes';
import { useAuth } from '@/hooks/useAuth';
import { computeProfile } from '@/lib/flavor/profile';
import { TASTES, describeProfile } from '@/lib/flavor/tastes';
import { useKitchen } from '@/lib/kitchen/store';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen">
    <Navigation />
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    <Footer />
  </div>
);

const RemixDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { remix, isLoading, isMine } = useRemix(id);
  const { recipe, isLoading: recipeLoading } = useRecipe(remix?.parentRecipeId);
  const { remix: parent } = useRemix(remix?.parentRemixId);
  const children = useRemixChildren(id ?? '');
  const signedIn = useAuth((s) => s.user !== null);
  const editRemix = useKitchen((s) => s.editRemix);
  const removeRemix = useKitchen((s) => s.removeRemix);
  const myRemixes = useKitchen((s) => s.remixes);
  const [cookOpen, setCookOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const profile = useMemo(() => (remix ? computeProfile(remix.ingredients) : null), [remix]);

  if (isLoading || (remix && recipeLoading)) {
    return (
      <Shell>
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
      </Shell>
    );
  }
  if (!remix || !profile) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold">This remix isn't available</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          It may be private, deleted, or saved on another device. If it's yours, sign in to load it from your account.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/kitchen">Go to My Kitchen</Link>
        </Button>
      </Shell>
    );
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Couldn’t copy the link. Copy it from the address bar instead.');
    }
  };

  const doDelete = () => {
    removeRemix(remix.id);
    setConfirmDelete(false);
    toast.success('Remix deleted');
    navigate('/kitchen');
  };

  return (
    <Shell>
      <Link to="/kitchen" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My Kitchen
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{remix.title}</h1>
          <p className="mt-2 text-muted-foreground">
            Remix of{' '}
            {recipe ? (
              <Link to={`/recipes/${recipe.id}`} className="underline underline-offset-2 hover:text-foreground">{recipe.title}</Link>
            ) : (
              'a recipe that is no longer in the catalog'
            )}
            {parent && (
              <>
                , forked from{' '}
                <Link to={`/remixes/${parent.id}`} className="underline underline-offset-2 hover:text-foreground">{parent.title}</Link>
              </>
            )}
          </p>
          {remix.note && <p className="mt-4 max-w-prose whitespace-pre-line text-lg">{remix.note}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            {recipe && (
              <Button asChild>
                <Link to={`/recipes/${recipe.id}?remix=${remix.id}`}>
                  <GitFork className="mr-2 h-4 w-4" /> Fork this remix
                </Link>
              </Button>
            )}
            {recipe && (
              <Button asChild variant="outline">
                <Link to={`/cook/${recipe.id}?remix=${remix.id}`}>
                  <ChefHat className="mr-2 h-4 w-4" /> Start cooking
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setCookOpen(true)}>
              <CookingPot className="mr-2 h-4 w-4" /> I cooked this
            </Button>
            {remix.isPublic && (
              <Button variant="outline" onClick={copyLink}>
                <Link2 className="mr-2 h-4 w-4" /> Copy link
              </Button>
            )}
          </div>

          {isMine && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm">
              {signedIn ? (
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={remix.isPublic}
                    onChange={(e) => editRemix(remix.id, { isPublic: e.target.checked })}
                    className="h-4 w-4 accent-[hsl(var(--foreground))]"
                  />
                  <span>
                    <span className="font-medium">Public.</span>
                    <span className="text-muted-foreground"> Anyone can see it on the recipe page and fork it.</span>
                  </span>
                </label>
              ) : (
                <span className="text-muted-foreground">Saved on this device. Sign in to share it or keep it across devices.</span>
              )}
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            </div>
          )}

          {(remix.removed.length > 0 || remix.added.length > 0) && (
            <section className="mt-12" aria-labelledby="changes">
              <h2 id="changes" className="text-2xl font-bold">What changed</h2>
              <p className="mt-1 text-sm text-muted-foreground">Compared with {parent ? 'the remix it was forked from' : 'the original recipe'}.</p>
              <ul className="mt-4 space-y-1.5">
                {remix.removed.map((name) => (
                  <li key={`r-${name}`} className="flex gap-3"><span className="w-4 font-semibold text-muted-foreground">−</span><span className="line-through decoration-muted-foreground">{name}</span></li>
                ))}
                {remix.added.map((name) => (
                  <li key={`a-${name}`} className="flex gap-3"><span className="w-4 font-semibold">+</span><span className="font-medium">{name}</span></li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12" aria-labelledby="ingredients">
            <h2 id="ingredients" className="text-2xl font-bold">Ingredients</h2>
            <ul className="mt-4 divide-y border-y">
              {remix.ingredients.map((ing, i) => (
                <li key={`${ing.name}-${i}`} className="py-2.5">
                  {ing.name}
                  {ing.measure && <span className="text-muted-foreground">, {ing.measure}</span>}
                </li>
              ))}
            </ul>
          </section>

          {recipe && (
            <section className="mt-12" aria-labelledby="method">
              <h2 id="method" className="text-2xl font-bold">Method</h2>
              <p className="mt-1 text-sm text-muted-foreground">From the original recipe. Adjust for your changes as you go.</p>
              <ol className="mt-4 max-w-prose space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="grid grid-cols-[2rem_1fr] gap-2 leading-relaxed">
                    <span className="font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-12" aria-labelledby="forks">
            <h2 id="forks" className="text-2xl font-bold">Forks of this remix</h2>
            {children.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No one has forked this remix yet.</p>
            ) : (
              <ul className="mt-2 divide-y border-y">
                {children.map((r) => (
                  <li key={r.id}><RemixRow remix={r} mine={myRemixes.some((m) => m.id === r.id)} /></li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="order-first lg:order-none">
          <div className="rounded-lg border bg-card p-5 lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold">How it tastes</h2>
            <p className="text-sm text-muted-foreground">{describeProfile(profile.vector)}</p>
            <div className="mt-2 flex justify-center">
              <FlavorRadar values={profile.vector} compare={recipe?.flavor.vector} compareLabel="the original recipe" size={280} />
            </div>
            {recipe && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                Original recipe
              </p>
            )}
            <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
              {TASTES.map((t, i) => {
                const delta = recipe ? profile.vector[i] - recipe.flavor.vector[i] : 0;
                return (
                  <div key={t.key} className="grid grid-cols-[5.5rem_2rem_1fr] items-baseline gap-2">
                    <dt className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
                      {t.label}
                    </dt>
                    <dd className="tabular-nums">{profile.vector[i].toFixed(1)}</dd>
                    <dd className="tabular-nums text-muted-foreground">
                      {Math.abs(delta) >= 0.1 ? `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} vs original` : ''}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </aside>
      </div>

      {recipe && <CookDialog open={cookOpen} onOpenChange={setCookOpen} recipeId={recipe.id} remixId={remix.id} title={remix.title} />}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{remix.title}”?</DialogTitle>
            <DialogDescription>
              This can’t be undone. Forks of it and cooking log entries are kept, but they’ll no longer link back to it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep remix</Button>
            <Button variant="destructive" onClick={doDelete}>Delete remix</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

export default RemixDetail;
