import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Mic, Timer, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CookDialog from '@/components/kitchen/CookDialog';
import TasteCheck from '@/components/kitchen/TasteCheck';
import { useRecipe } from '@/hooks/useRecipes';
import { useRemix } from '@/hooks/useRemixes';
import { canListen, canReadAloud, useSpeaker, useVoiceCommands } from '@/hooks/useHandsFree';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { checkpointReason, findCheckpoints, personalHint, type Checkpoint } from '@/lib/cook/checkpoints';
import { leftoverCandidates } from '@/lib/cook/leftovers';
import { planTogether, roughDuration, type PlanItem } from '@/lib/cook/together';
import { VOICE_HELP, type VoiceCommand } from '@/lib/cook/voice';
import type { DishProblem } from '@/lib/flavor/fixes';
import { computeProfile, type IngredientLine } from '@/lib/flavor/profile';
import type { TasteVector } from '@/lib/flavor/tastes';
import { seasoningHand } from '@/lib/kitchen/seasoningHand';
import { useKitchen } from '@/lib/kitchen/store';
import { findTimers, formatClock } from '@/lib/recipes/timers';
import { scaleLabel, scaleMeasure } from '@/lib/recipes/scaling';
import { cn } from '@/lib/utils';

interface RunningTimer {
  id: number;
  label: string;
  step: number;
  endsAt: number;
  done: boolean;
}

/** One of the dishes being cooked: one normally, two when cooking a pair together. */
interface Dish {
  recipeId: string;
  remixId: string | null;
  title: string;
  ingredients: IngredientLine[];
  vector: TasteVector;
  checkpoints: Checkpoint[];
  scale: number;
  hasLeftovers: boolean;
}

const READ_ALOUD_KEY = 'flavorcraft:cook:read-aloud';

/** A short two-tone chime using Web Audio, so no sound file is needed. */
const chime = () => {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i % 2 ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.32);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio unavailable; the toast and on-screen state still show the timer finished.
  }
  navigator.vibrate?.([200, 100, 200]);
};

/** Keeps the screen on while cooking, where the browser supports it. */
const useWakeLock = () => {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        // Not supported or denied (e.g. low battery); cooking mode still works.
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && request();
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
};

const toggleClass = (on: boolean) => cn('gap-1.5', on && 'bg-foreground text-background hover:bg-foreground/90 hover:text-background');

const CookMode = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const remixId = params.get('remix');
  const withId = params.get('with') ?? undefined;
  const scale = Number(params.get('scale')) || 1;
  const { recipe, isLoading } = useRecipe(id);
  const { recipe: second } = useRecipe(withId);
  const { remix, isLoading: remixLoading } = useRemix(remixId);
  const cooks = useKitchen((s) => s.cooks);
  const remixes = useKitchen((s) => s.remixes);
  const hint = useMemo(() => personalHint(seasoningHand({ cooks, remixes })), [cooks, remixes]);
  useWakeLock();

  const dishes = useMemo<Dish[]>(() => {
    if (!recipe) return [];
    const first: Dish = {
      recipeId: recipe.id,
      remixId: remix?.id ?? null,
      title: remix?.title ?? recipe.title,
      ingredients: remix?.ingredients ?? recipe.ingredients,
      vector: remix ? computeProfile(remix.ingredients).vector : recipe.flavor.vector,
      checkpoints: findCheckpoints(recipe.steps, recipe.category),
      scale,
      hasLeftovers: leftoverCandidates(recipe).length > 0,
    };
    if (!second || second.id === recipe.id) return [first];
    return [
      first,
      {
        recipeId: second.id,
        remixId: null,
        title: second.title,
        ingredients: second.ingredients,
        vector: second.flavor.vector,
        checkpoints: findCheckpoints(second.steps, second.category),
        scale: 1,
        hasLeftovers: leftoverCandidates(second).length > 0,
      },
    ];
  }, [recipe, second, remix, scale]);
  const together = dishes.length === 2;

  // What to do, in order. For two dishes, their steps are merged into one plan.
  const plan = useMemo(() => (recipe && second && together ? planTogether(recipe.steps, second.steps) : null), [recipe, second, together]);
  const items = useMemo<PlanItem[]>(
    () => plan?.items ?? (recipe?.steps ?? []).map((text, index) => ({ kind: 'step' as const, dish: 0 as const, index, text, at: 0 })),
    [plan, recipe],
  );

  const title = together ? `${dishes[0].title} with ${dishes[1].title}` : (dishes[0]?.title ?? '');
  const exitTo = remix && !together ? `/remixes/${remix.id}` : `/recipes/${id}`;
  useDocumentTitle(recipe ? `Cooking: ${title}` : undefined);

  // Step -1 is "get ready" (gather ingredients); items.length is "done".
  const [step, setStep] = useState(-1);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [logDish, setLogDish] = useState<number | null>(null);
  const [logged, setLogged] = useState<Set<number>>(new Set());
  // What was off at each tasting, by position in the plan ("end-0" for the final check of dish 0).
  const [tasted, setTasted] = useState<Record<string, DishProblem[]>>({});
  const nextTimerId = useRef(1);

  const [readAloud, setReadAloud] = useState(() => canReadAloud() && localStorage.getItem(READ_ALOUD_KEY) === '1');
  const [voice, setVoice] = useState(false);
  const speak = useSpeaker();

  const current = step >= 0 && step < items.length ? items[step] : null;
  const currentTimers = useMemo(() => {
    if (!current) return [];
    return current.kind === 'wait' ? [{ label: roughDuration(current.seconds).replace('about ', ''), seconds: current.seconds }] : findTimers(current.text);
  }, [current]);
  const checkpoint = current?.kind === 'step' ? dishes[current.dish]?.checkpoints.find((c) => c.step === current.index) : undefined;

  /** What's on screen now, as a sentence to read out. */
  const spoken = useMemo(() => {
    if (step === -1) return 'Get everything ready.';
    if (!current) return 'That’s everything. Taste it before serving.';
    if (current.kind === 'wait') return `Nothing to do for ${roughDuration(current.seconds)}, while ${dishes[current.dish]?.title} cooks.`;
    const lead = together ? `${dishes[current.dish]?.title}. ` : `Step ${step + 1}. `;
    return `${lead}${current.text}${checkpoint ? ' Then taste it.' : ''}`;
  }, [step, current, dishes, together, checkpoint]);

  useEffect(() => {
    if (readAloud) speak(spoken);
  }, [readAloud, spoken, speak]);

  // Tick once a second while any timer runs, and announce finished ones.
  useEffect(() => {
    if (!timers.some((t) => !t.done)) return;
    const interval = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setTimers((prev) => {
        if (!prev.some((timer) => !timer.done && timer.endsAt <= t)) return prev;
        return prev.map((timer) => {
          if (timer.done || timer.endsAt > t) return timer;
          chime();
          toast(`Timer done: ${timer.label}`, { description: `From step ${timer.step + 1}` });
          if (readAloud) speak(`Timer done: ${timer.label}, from step ${timer.step + 1}.`);
          return { ...timer, done: true };
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timers, readAloud, speak]);

  const go = useCallback((delta: number) => setStep((s) => Math.max(-1, Math.min(items.length, s + delta))), [items.length]);

  const startTimer = useCallback(
    (label: string, seconds: number) => {
      setNow(Date.now());
      setTimers((prev) => [...prev, { id: nextTimerId.current++, label, step, endsAt: Date.now() + seconds * 1000, done: false }]);
    },
    [step],
  );

  const onVoice = useCallback(
    (command: VoiceCommand) => {
      if (logDish !== null) return;
      if (command === 'next') go(1);
      else if (command === 'back') go(-1);
      else if (command === 'repeat') speak(spoken);
      else if (command === 'stop') setVoice(false);
      else if (command === 'timer') {
        const t = currentTimers[0];
        if (t) {
          startTimer(t.label, t.seconds);
          speak(`Timer started: ${t.label}.`);
        } else speak('There’s no timer in this step.');
      }
    },
    [go, speak, spoken, currentTimers, startTimer, logDish],
  );
  const listenError = useVoiceCommands(voice, onVoice);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (logDish !== null || (e.target as HTMLElement)?.closest('input, textarea, button, a')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, logDish]);

  if (isLoading || remixLoading) return <div className="min-h-screen" />;
  if (!recipe) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <h1 className="text-3xl font-bold">This recipe isn't in the catalog</h1>
        <Button asChild variant="outline" className="mt-6"><Link to="/recipes">Browse recipes</Link></Button>
      </main>
    );
  }

  const progress = items.length ? Math.max(0, step + 1) / items.length : 0;
  /** Everything noticed while tasting one dish, for its cooking log entry. */
  const noticedFor = (dish: number) => [
    ...new Set(
      Object.entries(tasted).flatMap(([key, problems]) => {
        const item = key.startsWith('end-') ? { dish: Number(key.slice(4)) } : items[Number(key)];
        return item && 'dish' in item && item.dish === dish ? problems : [];
      }),
    ),
  ];
  const toggleReadAloud = () => {
    const next = !readAloud;
    setReadAloud(next);
    localStorage.setItem(READ_ALOUD_KEY, next ? '1' : '0');
    if (!next) window.speechSynthesis?.cancel();
  };
  const ingredientList = (dish: Dish, d: number) => (
    <ul className="divide-y border-y text-xl">
      {dish.ingredients.map((ing, i) => {
        const key = `${d}-${i}`;
        return (
          <li key={key}>
            <label className="flex cursor-pointer items-center gap-4 py-4">
              <input
                type="checkbox"
                checked={checked.has(key)}
                onChange={() =>
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
                className="h-6 w-6 accent-[hsl(var(--foreground))]"
              />
              <span className={cn(checked.has(key) && 'text-muted-foreground line-through')}>
                {ing.name}
                {ing.measure && <span className="text-muted-foreground">, {scaleMeasure(ing.name, ing.measure, dish.scale).text}</span>}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4">
          <p className="min-w-0 truncate font-semibold">{title}</p>
          <div className="flex shrink-0 items-center gap-1">
            {canReadAloud() && (
              <Button variant="ghost" size="sm" className={toggleClass(readAloud)} aria-pressed={readAloud} onClick={toggleReadAloud}>
                <Volume2 className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Read aloud</span>
              </Button>
            )}
            {canListen() && (
              <Button variant="ghost" size="sm" className={toggleClass(voice)} aria-pressed={voice} onClick={() => setVoice((v) => !v)}>
                <Mic className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Voice control</span>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to={exitTo}>
                <X className="h-4 w-4 sm:mr-1.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Exit cooking</span>
              </Link>
            </Button>
          </div>
        </div>
        <div className="h-1 bg-border" aria-hidden>
          <div className="h-full bg-foreground transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
        {voice && (
          <p className="mx-auto max-w-4xl px-4 py-2 text-sm text-muted-foreground" role="status">
            {listenError === 'blocked'
              ? 'The microphone is blocked. Allow it for this site in your browser, then turn voice control on again.'
              : listenError === 'unavailable'
                ? 'This browser can’t listen for voice commands.'
                : `Listening. ${VOICE_HELP} Your browser turns speech into text, and may send the audio to its maker to do so.`}
          </p>
        )}
        {timers.length > 0 && (
          <ul className="mx-auto flex max-w-4xl flex-wrap gap-2 px-4 py-2" aria-label="Timers">
            {timers.map((t) => (
              <li
                key={t.id}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1 text-sm tabular-nums',
                  t.done && 'border-[#D93A22] bg-[#D93A22]/10 font-semibold',
                )}
              >
                <Timer className="h-3.5 w-3.5" aria-hidden />
                <span>Step {t.step + 1}:</span>
                <span aria-live={t.done ? 'assertive' : 'off'}>{t.done ? 'Done' : formatClock((t.endsAt - now) / 1000)}</span>
                <button
                  type="button"
                  onClick={() => setTimers((prev) => prev.filter((x) => x.id !== t.id))}
                  className="rounded p-0.5 hover:bg-muted"
                  aria-label={`Dismiss timer for step ${t.step + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        {step === -1 && (
          <section aria-labelledby="ready">
            <h1 id="ready" className="text-4xl font-bold sm:text-5xl">Get everything ready</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Tick off each ingredient as you set it out.
              {scale !== 1 && ` Amounts${together ? ` for ${dishes[0].title}` : ''} are for a ${scaleLabel(scale)} batch; seasonings are scaled a little less, so taste as you go.`}
            </p>
            {plan && (
              <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-lg">
                Both dishes together take {roughDuration(plan.total)}. The steps are in one order, so the quicker dish is made
                while the other one simmers, bakes or rests, and both are ready at about the same time. Times are estimates
                from the recipe text.
              </p>
            )}
            {together ? (
              dishes.map((dish, d) => (
                <div key={dish.recipeId} className="mt-8">
                  <h2 className="mb-3 text-2xl font-semibold">{dish.title}</h2>
                  {ingredientList(dish, d)}
                </div>
              ))
            ) : (
              <div className="mt-8">{ingredientList(dishes[0], 0)}</div>
            )}
            {remix && (
              <p className="mt-4 text-sm text-muted-foreground">
                You're cooking your remix. The method is from the original recipe, so adjust for your changes.
              </p>
            )}
          </section>
        )}

        {current && (
          <section>
            <div aria-live="polite">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-medium text-muted-foreground">
                <span>Step {step + 1} of {items.length}</span>
                {together && (
                  <span
                    className={cn(
                      'rounded-full border px-3 py-0.5 text-base text-foreground',
                      current.dish === 0 && 'border-foreground bg-foreground text-background',
                    )}
                  >
                    {dishes[current.dish].title}
                  </span>
                )}
              </p>
              {current.kind === 'step' ? (
                <p className="mt-4 text-[clamp(1.6rem,4.2vw,2.6rem)] font-medium leading-snug">{current.text}</p>
              ) : (
                <>
                  <p className="mt-4 text-[clamp(1.6rem,4.2vw,2.6rem)] font-medium leading-snug">
                    Nothing to do for {roughDuration(current.seconds)}.
                  </p>
                  <p className="mt-3 text-lg text-muted-foreground">
                    {dishes[current.dish].title} is cooking on its own. Set a timer, clear up, and come back when it goes.
                  </p>
                </>
              )}
            </div>
            {currentTimers.map((t) => (
              <Button key={t.label} variant="outline" size="lg" className="mr-3 mt-8" onClick={() => startTimer(t.label, t.seconds)}>
                <Timer className="mr-2 h-5 w-5" /> Start {t.label} timer
              </Button>
            ))}
            {checkpoint && current.kind === 'step' && (
              <TasteCheck
                key={step}
                vector={dishes[current.dish].vector}
                heading="When this step is done, taste it"
                reason={checkpointReason(checkpoint)}
                hint={hint}
                picked={tasted[step] ?? []}
                onChange={(problems) => setTasted((prev) => ({ ...prev, [step]: problems }))}
              />
            )}
          </section>
        )}

        {step === items.length && (
          <section aria-labelledby="done">
            <h1 id="done" className="text-4xl font-bold sm:text-5xl">That's everything.</h1>
            <p className="mt-3 text-lg text-muted-foreground">Taste before serving. If something's off, pick it below for a fix.</p>
            {dishes.map((dish, d) => (
              <div key={dish.recipeId}>
                <TasteCheck
                  vector={dish.vector}
                  heading={together ? `Taste ${dish.title}` : 'One last taste'}
                  hint={hint}
                  picked={tasted[`end-${d}`] ?? []}
                  onChange={(problems) => setTasted((prev) => ({ ...prev, [`end-${d}`]: problems }))}
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => setLogDish(d)} disabled={logged.has(d)}>
                    {logged.has(d) ? (
                      <><Check className="mr-2 h-5 w-5" /> Logged</>
                    ) : together ? (
                      `Log ${dish.title}`
                    ) : (
                      'Log how it turned out'
                    )}
                  </Button>
                  {dish.hasLeftovers && (
                    <Button size="lg" variant="outline" asChild>
                      <Link to={`/leftovers?from=${dish.recipeId}`}>Use up what’s left</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Button variant="outline" size="lg" onClick={() => go(-1)} disabled={step === -1}>
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <p className="hidden text-sm text-muted-foreground sm:block">Arrow keys or space to move between steps</p>
          {step < items.length && (
            <Button size="lg" onClick={() => go(1)}>
              {step === -1 ? 'Start cooking' : step === items.length - 1 ? 'Finish' : 'Next step'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </footer>

      {logDish !== null && dishes[logDish] && (
        <CookDialog
          open
          onOpenChange={(open) => !open && setLogDish(null)}
          onLogged={() => {
            setLogged((prev) => new Set(prev).add(logDish));
            if (!together) navigate(exitTo);
          }}
          recipeId={dishes[logDish].recipeId}
          remixId={dishes[logDish].remixId}
          title={dishes[logDish].title}
          initialProblems={noticedFor(logDish)}
        />
      )}
    </div>
  );
};

export default CookMode;
