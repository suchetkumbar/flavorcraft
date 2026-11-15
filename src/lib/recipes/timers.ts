export interface StepTimer {
  /** Text as written in the step, e.g. "30 minutes" or "3-4 minutes". */
  label: string;
  seconds: number;
}

const UNIT_SECONDS: Record<string, number> = { sec: 1, second: 1, min: 60, minute: 60, hr: 3600, hour: 3600 };

const PATTERN = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;

/**
 * Finds durations in a recipe step ("simmer 30 minutes", "3–4 mins a side").
 * Ranges use the upper bound, so the timer errs toward done rather than underdone.
 */
export const findTimers = (step: string): StepTimer[] => {
  const timers: StepTimer[] = [];
  for (const m of step.matchAll(PATTERN)) {
    const value = Number(m[2] ?? m[1]);
    const unit = m[3].toLowerCase().replace(/s$/, '');
    const per = UNIT_SECONDS[unit] ?? UNIT_SECONDS[unit.slice(0, 3)];
    if (!per || !value) continue;
    const seconds = Math.round(value * per);
    if (seconds < 10 || seconds > 12 * 3600) continue;
    timers.push({ label: m[0], seconds });
  }
  return timers;
};

export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
};
