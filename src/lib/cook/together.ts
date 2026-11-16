import { findTimers } from '../recipes/timers';

export interface StepEffort {
  /** Time you're busy with this step, in seconds. */
  active: number;
  /** Time the food then looks after itself (simmering, baking, resting). */
  wait: number;
}

const PASSIVE = /\b(simmer|bake|roast|rest|chill|marinate|marinade|refrigerate|fridge|freeze|cool|leave|set aside|stand|soak|prove|rise|braise|stew|slow cook|oven|steam|infuse)/i;
/** Shorter than this, you stay at the stove anyway. */
const MIN_WAIT = 5 * 60;

/** From this long, nobody stands over the pan, whatever the verb. */
const SURE_WAIT = 10 * 60;
const HANDS_ON = /\bstirring (constantly|continuously|all the time)|keep stirring|whisking constantly/i;

/**
 * Rough effort for a step. Doing time is guessed from how much the step says
 * (3 to 8 minutes); timings in the text are added as hands-on time when short,
 * or counted as a wait when the food looks after itself.
 */
export const stepEffort = (text: string): StepEffort => {
  const words = text.trim().split(/\s+/).length;
  let active = Math.min(480, Math.max(180, words * 6));
  let wait = 0;
  const passive = PASSIVE.test(text);
  const handsOn = HANDS_ON.test(text);
  for (const t of findTimers(text)) {
    if (!handsOn && (t.seconds >= SURE_WAIT || (passive && t.seconds >= MIN_WAIT))) wait = Math.max(wait, t.seconds);
    else active += t.seconds;
  }
  return { active, wait };
};

export type PlanItem =
  | { kind: 'step'; dish: 0 | 1; index: number; text: string; at: number }
  | { kind: 'wait'; seconds: number; dish: 0 | 1; at: number };

export interface TogetherPlan {
  items: PlanItem[];
  /** When each dish is finished, in seconds from the start. */
  finish: [number, number];
  total: number;
}

const soloTime = (efforts: StepEffort[]) => efforts.reduce((s, e) => s + e.active + e.wait, 0);

/**
 * Merges two recipes into one order of work for a single cook, so that both
 * are ready at about the same time. The longer dish starts first; the shorter
 * one is held back and fitted into the gaps where the longer one is simmering,
 * baking or resting.
 */
export const planTogether = (a: string[], b: string[]): TogetherPlan => {
  const steps = [a, b];
  const efforts = [a.map(stepEffort), b.map(stepEffort)];
  const solo = efforts.map(soloTime);
  const long = solo[0] >= solo[1] ? 0 : 1;
  const short = 1 - long;
  // Start the shorter dish late enough to finish with the longer one, with a
  // quarter of its time as slack because the cook will sometimes be busy.
  const freeAt = [0, 0]; // when each dish's next step can begin
  freeAt[short] = Math.max(0, solo[long] - solo[short] * 1.25);

  const next = [0, 0];
  const remaining = [...solo];
  const finish: [number, number] = [0, 0];
  const items: PlanItem[] = [];
  let now = 0;

  while (next[0] < steps[0].length || next[1] < steps[1].length) {
    const pending = ([0, 1] as const).filter((d) => next[d] < steps[d].length);
    const ready = pending.filter((d) => freeAt[d] <= now);
    if (ready.length === 0) {
      const until = Math.min(...pending.map((d) => freeAt[d]));
      // Name the dish that's cooking on its own, so the cook knows what the wait is for.
      const cooking = pending.find((d) => next[d] > 0) ?? pending[0];
      if (until - now >= 60) items.push({ kind: 'wait', seconds: until - now, dish: cooking, at: now });
      now = until;
      continue;
    }
    // Whichever has more left to do goes first, so neither falls behind.
    const dish = ready.sort((x, y) => remaining[y] - remaining[x])[0];
    const effort = efforts[dish][next[dish]];
    items.push({ kind: 'step', dish, index: next[dish], text: steps[dish][next[dish]], at: now });
    now += effort.active;
    freeAt[dish] = now + effort.wait;
    remaining[dish] -= effort.active + effort.wait;
    finish[dish] = freeAt[dish];
    next[dish] += 1;
  }
  return { items, finish, total: Math.max(finish[0], finish[1]) };
};

/** "about 1 hr 20 min" */
export const roughDuration = (seconds: number): string => {
  const raw = seconds / 60;
  const mins = raw < 10 ? Math.max(1, Math.round(raw)) : Math.round(raw / 5) * 5;
  if (mins < 60) return `about ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `about ${h} hr${m ? ` ${m} min` : ''}`;
};
