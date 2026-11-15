import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CookDialog from '@/components/kitchen/CookDialog';
import { useRecipe } from '@/hooks/useRecipes';
import { useRemix } from '@/hooks/useRemixes';
import { findTimers, formatClock } from '@/lib/recipes/timers';
import { scaleLabel, scaleMeasure } from '@/lib/recipes/scaling';
import { cn } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface RunningTimer {
  id: number;
  label: string;
  step: number;
  endsAt: number;
  done: boolean;
}

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

const CookMode = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const remixId = params.get('remix');
  const scale = Number(params.get('scale')) || 1;
  const { recipe, isLoading } = useRecipe(id);
  const { remix, isLoading: remixLoading } = useRemix(remixId);
  useWakeLock();
  useDocumentTitle(recipe ? `Cooking: ${remix?.title ?? recipe.title}` : undefined);

  // Step -1 is "get ready" (gather ingredients); steps.length is "done".
  const [step, setStep] = useState(-1);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [logOpen, setLogOpen] = useState(false);
  const nextTimerId = useRef(1);

  const ingredients = remix?.ingredients ?? recipe?.ingredients ?? [];
  const steps = useMemo(() => recipe?.steps ?? [], [recipe]);
  const title = remix?.title ?? recipe?.title ?? '';
  const exitTo = remix ? `/remixes/${remix.id}` : `/recipes/${id}`;

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
          return { ...timer, done: true };
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timers]);

  const go = useCallback((delta: number) => setStep((s) => Math.max(-1, Math.min(steps.length, s + delta))), [steps.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (logOpen || (e.target as HTMLElement)?.closest('input, textarea, button, a')) return;
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
  }, [go, logOpen]);

  const startTimer = (label: string, seconds: number) => {
    setNow(Date.now());
    setTimers((prev) => [...prev, { id: nextTimerId.current++, label, step, endsAt: Date.now() + seconds * 1000, done: false }]);
  };

  if (isLoading || remixLoading) return <div className="min-h-screen" />;
  if (!recipe) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <h1 className="text-3xl font-bold">This recipe isn't in the catalog</h1>
        <Button asChild variant="outline" className="mt-6"><Link to="/recipes">Browse recipes</Link></Button>
      </main>
    );
  }

  const progress = steps.length ? Math.max(0, step + 1) / steps.length : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <p className="truncate font-semibold">{title}</p>
          <Button asChild variant="ghost" size="sm">
            <Link to={exitTo}><X className="mr-1.5 h-4 w-4" /> Exit cooking</Link>
          </Button>
        </div>
        <div className="h-1 bg-border" aria-hidden>
          <div className="h-full bg-foreground transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
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
              {scale !== 1 && ` Amounts are for a ${scaleLabel(scale)} batch; seasonings are scaled a little less, so taste as you go.`}
            </p>
            <ul className="mt-8 divide-y border-y text-xl">
              {ingredients.map((ing, i) => (
                <li key={`${ing.name}-${i}`}>
                  <label className="flex cursor-pointer items-center gap-4 py-4">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      className="h-6 w-6 accent-[hsl(var(--foreground))]"
                    />
                    <span className={cn(checked.has(i) && 'text-muted-foreground line-through')}>
                      {ing.name}
                      {ing.measure && <span className="text-muted-foreground">, {scaleMeasure(ing.name, ing.measure, scale).text}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {remix && (
              <p className="mt-4 text-sm text-muted-foreground">
                You're cooking your remix. The method is from the original recipe, so adjust for your changes.
              </p>
            )}
          </section>
        )}

        {step >= 0 && step < steps.length && (
          <section aria-live="polite">
            <p className="text-lg font-medium text-muted-foreground">Step {step + 1} of {steps.length}</p>
            <p className="mt-4 text-[clamp(1.6rem,4.2vw,2.6rem)] font-medium leading-snug">{steps[step]}</p>
            {findTimers(steps[step]).map((t) => (
              <Button key={t.label} variant="outline" size="lg" className="mr-3 mt-8" onClick={() => startTimer(t.label, t.seconds)}>
                <Timer className="mr-2 h-5 w-5" /> Start {t.label} timer
              </Button>
            ))}
          </section>
        )}

        {step === steps.length && (
          <section aria-labelledby="done">
            <h1 id="done" className="text-4xl font-bold sm:text-5xl">That's everything.</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Taste it before serving. If something's off, the recipe page can suggest a fix.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setLogOpen(true)}>Log how it turned out</Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={`${exitTo}#fix`}>Fix something</Link>
              </Button>
            </div>
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Button variant="outline" size="lg" onClick={() => go(-1)} disabled={step === -1}>
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <p className="hidden text-sm text-muted-foreground sm:block">Arrow keys or space to move between steps</p>
          {step < steps.length && (
            <Button size="lg" onClick={() => go(1)}>
              {step === -1 ? 'Start cooking' : step === steps.length - 1 ? 'Finish' : 'Next step'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </footer>

      <CookDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        onLogged={() => navigate(exitTo)}
        recipeId={recipe.id}
        remixId={remix?.id ?? null}
        title={title}
      />
    </div>
  );
};

export default CookMode;
