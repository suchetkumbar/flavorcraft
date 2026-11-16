import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowLeftRight, Bookmark, ChefHat, CookingPot, GitFork, Plus, RotateCcw, Shuffle, X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRecipe } from '@/hooks/useRecipes';
import { useRemix, useRemixesOf } from '@/hooks/useRemixes';
import { useKitchen } from '@/lib/kitchen/store';
import type { Remix } from '@/lib/kitchen/types';
import { draftKey, removedIndexes, useDrafts } from '@/lib/kitchen/drafts';
import CookDialog from '@/components/kitchen/CookDialog';
import SaveRemixDialog from '@/components/kitchen/SaveRemixDialog';
import RemixTree from '@/components/community/RemixTree';
import SwapPanel from '@/components/kitchen/SwapPanel';
import AiFixPanel from '@/components/kitchen/AiFixPanel';
import AuthDialog from '@/components/kitchen/AuthDialog';
import GoesWith from '@/components/GoesWith';
import { useAuth } from '@/hooks/useAuth';
import { accountsEnabled } from '@/lib/supabase';
import { computeProfile, type IngredientLine } from '@/lib/flavor/profile';
import { KNOWN_INGREDIENTS, matchIngredient } from '@/lib/flavor/ingredients';
import { PROBLEMS, applyEffect, fixesFor, type DishProblem } from '@/lib/flavor/fixes';
import { balanceWarnings } from '@/lib/flavor/balance';
import { SCALE_OPTIONS, scaleLabel, scaleMeasure } from '@/lib/recipes/scaling';
import { amountFactorFor, seasoningHand } from '@/lib/kitchen/seasoningHand';
import { TASTES, describeProfile, type TasteVector } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const sameVector = (a: TasteVector, b: TasteVector) => a.every((x, i) => Math.abs(x - b[i]) < 0.05);

const RecipeDetail = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const baseId = params.get('remix');
  const { recipe, isLoading } = useRecipe(id);
  const { remix: base, isLoading: baseLoading } = useRemix(baseId);
  useDocumentTitle(isLoading ? undefined : recipe ? (base ? `Remixing ${base.title}` : recipe.title) : 'Recipe not found');

  if (isLoading || baseLoading) {
    return (
      <Shell>
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-6 aspect-[16/9] animate-pulse rounded-lg bg-muted" />
      </Shell>
    );
  }
  if (!recipe) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold">This recipe isn't in the catalog</h1>
        <p className="mt-2 text-muted-foreground">The link may be out of date.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/recipes">Browse recipes</Link>
        </Button>
      </Shell>
    );
  }
  // Keyed so remix state resets when navigating between recipes or base remixes.
  const validBase = base && base.parentRecipeId === recipe.id ? base : null;
  return <RecipeView key={`${recipe.id}:${validBase?.id ?? ''}`} recipe={recipe} base={validBase} />;
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen">
    <Navigation />
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    <Footer />
  </div>
);

type Props = { recipe: NonNullable<ReturnType<typeof useRecipe>['recipe']>; base: Remix | null };

const RecipeView = ({ recipe, base }: Props) => {
  const baseLines = base?.ingredients ?? recipe.ingredients;
  const isSaved = useKitchen((s) => s.saved.some((x) => x.recipeId === recipe.id));
  const toggleSave = useKitchen((s) => s.toggleSave);
  const remixes = useRemixesOf(recipe.id);
  const [cookOpen, setCookOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(1);
  const myCooks = useKitchen((s) => s.cooks);
  const myRemixes = useKitchen((s) => s.remixes);
  const hand = useMemo(() => seasoningHand({ cooks: myCooks, remixes: myRemixes }), [myCooks, myRemixes]);
  const [adjust, setAdjust] = useState(false);
  const handApplies = (base?.ingredients ?? recipe.ingredients).some((l) => amountFactorFor(l.name, hand) !== 1);
  const signedIn = useAuth((s) => s.user !== null);
  // Unsaved edits are kept as a draft on this device, so leaving the page never loses them.
  const key = draftKey(recipe.id, base?.id ?? null);
  const saveDraft = useDrafts((s) => s.saveDraft);
  const clearDraft = useDrafts((s) => s.clearDraft);
  const [restored] = useState(() => useDrafts.getState().drafts[key] ?? null);
  const [removed, setRemoved] = useState<Set<number>>(() =>
    restored ? removedIndexes(base?.ingredients ?? recipe.ingredients, restored.removed) : new Set(),
  );
  const [added, setAdded] = useState<IngredientLine[]>(() => restored?.added ?? []);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<DishProblem | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const original = useMemo(() => (base ? computeProfile(base.ingredients) : recipe.flavor), [base, recipe.flavor]);
  const remixLines = useMemo(
    () => [...baseLines.filter((_, i) => !removed.has(i)), ...added],
    [baseLines, removed, added],
  );
  const remix = useMemo(() => computeProfile(remixLines), [remixLines]);
  const isRemixed = removed.size > 0 || added.length > 0;

  useEffect(() => {
    saveDraft(key, { removed: baseLines.filter((_, i) => removed.has(i)).map((l) => l.name), added });
  }, [key, baseLines, removed, added, saveDraft]);

  const fixes = useMemo(() => (problem ? fixesFor(problem, remix.vector) : []), [problem, remix.vector]);
  const shown = preview !== null && fixes[preview] ? applyEffect(remix.vector, fixes[preview].effect) : remix.vector;
  const changed = !sameVector(shown, original.vector);

  const toggle = (i: number) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const addIngredient = () => {
    const name = draft.trim();
    if (!name) return;
    setAdded((prev) => [...prev, { name, measure: '' }]);
    setDraft('');
  };

  const reset = () => {
    setRemoved(new Set());
    setAdded([]);
    setPreview(null);
  };

  const unmatchedDraft = draft.trim().length > 2 && !matchIngredient(draft);

  return (
    <Shell>
      <Link to="/recipes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All recipes
      </Link>

      <div className="mt-6">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{recipe.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {recipe.area !== 'Unknown' ? `${recipe.area} ${recipe.category.toLowerCase()}` : recipe.category}
          {recipe.source === 'flavorcraft' ? ', a FlavorCraft original' : ''}
        </p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {recipe.summary && <p className="mt-4 max-w-prose text-lg">{recipe.summary}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant={isSaved ? 'default' : 'outline'} onClick={() => toggleSave(recipe.id)} aria-pressed={isSaved}>
              <Bookmark className={cn('mr-2 h-4 w-4', isSaved && 'fill-current')} />
              {isSaved ? 'Saved' : 'Save recipe'}
            </Button>
            <Button variant="outline" onClick={() => setCookOpen(true)}>
              <CookingPot className="mr-2 h-4 w-4" /> I cooked this
            </Button>
            <Button asChild variant="outline">
              <Link
                to={`/cook/${recipe.id}?${new URLSearchParams({ ...(base && { remix: base.id }), ...(scale !== 1 && { scale: String(scale) }) })}`}
              >
                <ChefHat className="mr-2 h-4 w-4" /> Start cooking
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/compare?a=${recipe.id}`}>
                <ArrowLeftRight className="mr-2 h-4 w-4" /> Compare
              </Link>
            </Button>
          </div>
          {restored && isRemixed && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm" role="status">
              <p>You have unsaved changes to this recipe from earlier. They're kept on this device until you save or discard them.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={reset}>Discard changes</Button>
                <Button size="sm" onClick={() => setSaveOpen(true)}>Save remix</Button>
              </div>
            </div>
          )}
          {base && (
            <div className="mt-6 rounded-lg border px-4 py-3 text-sm">
              <p>
                You're editing a copy of <Link to={`/remixes/${base.id}`} className="font-medium underline underline-offset-2">{base.title}</Link>.
                Saving creates a new remix forked from it; the original stays as it is.
              </p>
            </div>
          )}
          {recipe.image && (
            <img src={recipe.image} alt={recipe.title} className="mt-6 aspect-[16/10] w-full rounded-lg object-cover" />
          )}

          {/* Ingredients and remix */}
          <section className="mt-12" aria-labelledby="ingredients">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="ingredients" className="text-2xl font-bold">Ingredients</h2>
              {isRemixed && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <RotateCcw className="mr-1.5 h-4 w-4" /> Undo changes
                  </Button>
                  <Button size="sm" onClick={() => setSaveOpen(true)}>
                    <GitFork className="mr-1.5 h-4 w-4" /> Save remix
                  </Button>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Uncheck an ingredient or add one to see how the flavor profile changes.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium" id="scale-label">Make</span>
              <div className="inline-flex rounded-md border p-0.5" role="group" aria-labelledby="scale-label">
                {SCALE_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={scale === f}
                    onClick={() => setScale(f)}
                    className={cn('rounded px-3 py-1 text-sm', scale === f ? 'bg-foreground text-background' : 'hover:bg-muted')}
                  >
                    {scaleLabel(f)}
                  </button>
                ))}
              </div>
              {handApplies && (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={adjust} onChange={(e) => setAdjust(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--foreground))]" />
                  Adjust to my taste
                </label>
              )}
              {scale > 1 && (
                <span className="text-sm text-muted-foreground">
                  Seasonings marked <span aria-hidden>∼</span> are scaled less. Taste and add more at the end.
                  {scale >= 2 && ' A bigger batch also takes longer to brown and reduce; use a wider pan.'}
                </span>
              )}
            </div>
            <ul className="mt-4 divide-y border-y">
              {baseLines.map((ing, i) => {
                const off = removed.has(i);
                const match = matchIngredient(ing.name);
                return (
                  <li key={`${ing.name}-${i}`}>
                    <label className="flex cursor-pointer items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={!off}
                        onChange={() => toggle(i)}
                        className="h-4 w-4 accent-[hsl(var(--foreground))]"
                      />
                      <span className={cn('flex-1', off && 'text-muted-foreground line-through')}>
                        {ing.name}
                        {ing.measure && (() => {
                          const personal = adjust ? amountFactorFor(ing.name, hand) : 1;
                          const m = scaleMeasure(ing.name, ing.measure, scale * personal);
                          return (
                            <span className="text-muted-foreground">
                              , {m.text}
                              {m.eased && <span title="Scaled less than the rest: seasoning" aria-label="(scaled less: seasoning)"> ∼</span>}
                              {personal !== 1 && m.scaled && (
                                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{personal < 1 ? 'less' : 'more'}, for you</span>
                              )}
                            </span>
                          );
                        })()}
                      </span>
                      {match ? <IngredientTastes vector={match.vector} /> : (
                        <span className="text-xs text-muted-foreground">not profiled</span>
                      )}
                      {accountsEnabled && !off && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (!signedIn) setAuthOpen(true);
                            else setSwapFor(swapFor === i ? null : i);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Find a swap for ${ing.name}`}
                          aria-expanded={swapFor === i}
                          title="Find a swap"
                        >
                          <Shuffle className="h-4 w-4" />
                        </button>
                      )}
                    </label>
                    {swapFor === i && (
                      <SwapPanel
                        recipeTitle={base?.title ?? recipe.title}
                        ingredients={remixLines}
                        ingredient={ing.name}
                        onClose={() => setSwapFor(null)}
                        onUse={(o) => {
                          setRemoved((prev) => new Set(prev).add(i));
                          setAdded((prev) => [...prev, { name: o.use, measure: o.amount }]);
                          setSwapFor(null);
                          toast.success(`Swapped ${ing.name} for ${o.use}`, { description: 'Save the remix to keep this version.' });
                        }}
                      />
                    )}
                  </li>
                );
              })}
              {added.map((ing, i) => (
                <li key={`added-${i}`} className="flex items-center gap-3 py-2.5">
                  <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="flex-1 font-medium">{ing.name}</span>
                  {matchIngredient(ing.name) ? (
                    <IngredientTastes vector={matchIngredient(ing.name)!.vector} />
                  ) : (
                    <span className="text-xs text-muted-foreground">not profiled</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAdded((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${ing.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addIngredient();
              }}
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add an ingredient, e.g. lime"
                list="known-ingredients"
                aria-label="Add an ingredient"
                className="max-w-xs"
              />
              <datalist id="known-ingredients">
                {KNOWN_INGREDIENTS.map((k) => <option key={k} value={k} />)}
              </datalist>
              <Button type="submit" variant="outline" disabled={!draft.trim()}>Add</Button>
            </form>
            {unmatchedDraft && (
              <p className="mt-2 text-sm text-muted-foreground">
                FlavorCraft doesn't have a profile for this yet, so it won't change the chart.
              </p>
            )}
          </section>

          {/* Fix my dish */}
          {balanceWarnings(remix).map((w) => (
            <div key={w.id} className="mt-12 rounded-lg border bg-card px-4 py-3" role="note">
              <p className="font-medium">
                <span aria-hidden>⚖ </span>
                {w.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{w.suggestion}</p>
              <button
                type="button"
                onClick={() => {
                  setProblem(w.problem);
                  setPreview(null);
                  document.getElementById('fix')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="mt-2 text-sm font-medium underline underline-offset-2"
              >
                See ways to balance it
              </button>
            </div>
          ))}

          <section className="mt-12" aria-labelledby="fix">
            <h2 id="fix" className="text-2xl font-bold">Fix my dish</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cooked it and something's off? Choose what's wrong and get fixes matched to this recipe.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="What's wrong">
              {PROBLEMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={problem === p.id}
                  onClick={() => {
                    setProblem(problem === p.id ? null : p.id);
                    setPreview(null);
                  }}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                    problem === p.id ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {fixes.length > 0 && (
              <ol className="mt-6 space-y-4">
                {fixes.map((fix, i) => (
                  <li
                    key={fix.action}
                    className={cn('rounded-lg border p-4 transition-colors', preview === i && 'border-foreground')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{i + 1}. {fix.action}</p>
                        <p className="text-sm text-muted-foreground">{fix.examples}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={preview === i ? 'default' : 'outline'}
                        onClick={() => setPreview(preview === i ? null : i)}
                        aria-pressed={preview === i}
                      >
                        {preview === i ? 'Hide preview' : 'Preview on chart'}
                      </Button>
                    </div>
                    <p className="mt-3 text-sm"><span className="font-medium">How much: </span>{fix.amount}</p>
                    <p className="mt-1 text-sm"><span className="font-medium">Why it works: </span>{fix.why}</p>
                    {fix.note && <p className="mt-2 text-sm text-muted-foreground">{fix.note}</p>}
                  </li>
                ))}
              </ol>
            )}
            {problem && accountsEnabled && (
              <AiFixPanel
                key={problem}
                recipeTitle={base?.title ?? recipe.title}
                ingredients={remixLines}
                steps={recipe.steps}
                problem={problem}
                profile={remix.vector}
                signedIn={signedIn}
                onSignIn={() => setAuthOpen(true)}
              />
            )}
          </section>

          {/* Method */}
          <section className="mt-12" aria-labelledby="method">
            <h2 id="method" className="text-2xl font-bold">Method</h2>
            <ol className="mt-4 max-w-prose space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] gap-2 leading-relaxed">
                  <span className="font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {(recipe.videoUrl || recipe.sourceUrl) && (
              <p className="mt-6 flex flex-wrap gap-4 text-sm">
                {recipe.videoUrl && (
                  <a href={recipe.videoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    Watch the video
                  </a>
                )}
                {recipe.sourceUrl && (
                  <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    Original source
                  </a>
                )}
              </p>
            )}
          </section>

          {!base && <GoesWith recipe={recipe} />}

          {/* Remixes */}
          <section className="mt-12" aria-labelledby="remixes">
            <h2 id="remixes" className="text-2xl font-bold">Remixes</h2>
            {remixes.all.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No remixes yet. Change the ingredients above and save your version to start one.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  The family tree of this recipe: each version sits to the right of the one it was forked from.
                </p>
                <div className="mt-4">
                  <RemixTree
                    recipeId={recipe.id}
                    recipeTitle={recipe.title}
                    recipeVector={recipe.flavor.vector}
                    remixes={remixes.all}
                    currentId={base?.id}
                    mineIds={remixes.mineIds}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        {/* Sticky flavor panel */}
        <aside className="order-first lg:order-none">
          <div className="rounded-lg border bg-card p-5 lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold">How it tastes</h2>
            <p className="text-sm text-muted-foreground">{describeProfile(shown)}</p>
            <div className="mt-2 flex justify-center">
              <FlavorRadar
                values={shown}
                compare={changed ? original.vector : undefined}
                compareLabel={base ? 'the remix you started from' : 'the original recipe'}
                size={280}
              />
            </div>
            {changed && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                {base ? 'Remix you started from' : 'Original recipe'}
              </p>
            )}
            <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
              {TASTES.map((t, i) => (
                <div key={t.key} className="grid grid-cols-[5.5rem_2rem_1fr] items-baseline gap-2">
                  <dt className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
                    {t.label}
                  </dt>
                  <dd className="tabular-nums">{shown[i].toFixed(1)}</dd>
                  <dd className="truncate text-muted-foreground" title={remix.sources[i].join(', ')}>
                    {remix.sources[i].join(', ') || 'none'}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Estimated from {remix.matched} of {remix.total} ingredients. Scores run from 0 to 10.
            </p>
          </div>
        </aside>
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <CookDialog open={cookOpen} onOpenChange={setCookOpen} recipeId={recipe.id} remixId={base?.id ?? null} title={base?.title ?? recipe.title} />
      <SaveRemixDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onSaved={() => clearDraft(key)}
        recipeId={recipe.id}
        parentRemixId={base?.id ?? null}
        defaultTitle={`My ${base?.title ?? recipe.title}`.slice(0, 120)}
        ingredients={remixLines}
        removed={baseLines.filter((_, i) => removed.has(i)).map((l) => l.name)}
        added={added.map((l) => l.name)}
      />
    </Shell>
  );
};

/** Up to two strongest tastes of a single ingredient. */
const IngredientTastes = ({ vector }: { vector: TasteVector }) => {
  const top = TASTES.map((t, i) => ({ ...t, v: vector[i] }))
    .filter((t) => t.v >= 4)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2);
  if (!top.length) return null;
  return (
    <span className="flex gap-1" aria-label={`Mainly ${top.map((t) => t.label.toLowerCase()).join(' and ')}`}>
      {top.map((t) => (
        <span key={t.key} className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} title={t.label} />
      ))}
    </span>
  );
};

export default RecipeDetail;
