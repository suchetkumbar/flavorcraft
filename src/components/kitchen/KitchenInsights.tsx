import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, X } from 'lucide-react';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import RecipeCard from '@/components/RecipeCard';
import { Button } from '@/components/ui/button';
import { describeLean, seasoningHand } from '@/lib/kitchen/seasoningHand';
import { describeDrift, tasteTimeline } from '@/lib/kitchen/timeline';
import { householdPicks } from '@/lib/kitchen/household';
import { MAX_MEMBERS, useTasteSettings } from '@/lib/kitchen/settings';
import { describeProfile, type TasteVector } from '@/lib/flavor/tastes';
import type { KitchenData } from '@/lib/kitchen/types';
import type { ProfiledRecipe } from '@/lib/recipes/types';

/** "Your seasoning hand": shown once there's enough evidence. */
export const SeasoningHandCard = ({ kitchen }: { kitchen: KitchenData }) => {
  const hand = useMemo(() => seasoningHand(kitchen), [kitchen]);
  if (hand.length === 0) return null;
  return (
    <section className="rounded-xl border bg-card p-5" aria-labelledby="hand-title">
      <h2 id="hand-title" className="text-lg font-semibold">Your seasoning hand</h2>
      <p className="text-sm text-muted-foreground">Learned from what you log and how you remix.</p>
      <ul className="mt-3 space-y-1.5">
        {hand.slice(0, 3).map((l) => <li key={l.taste}>{describeLean(l)}.</li>)}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        On recipe pages, turn on <span className="font-medium text-foreground">Adjust to my taste</span> to apply this to the amounts.
      </p>
    </section>
  );
};

/** Small multiples of your profile over time, with one sentence on the drift. */
export const TasteTimeline = ({ kitchen, byId }: { kitchen: KitchenData; byId: Map<string, ProfiledRecipe> }) => {
  const periods = useMemo(() => tasteTimeline(kitchen, byId), [kitchen, byId]);
  if (periods.length < 2) return null;
  const shown = periods.slice(-4);
  return (
    <section aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="text-2xl font-bold">Your taste over time</h2>
      <p className="mt-1 text-muted-foreground">{describeDrift(periods)}</p>
      <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {shown.map((p) => (
          <li key={p.label} className="rounded-lg border bg-card p-3 text-center">
            <FlavorRadar values={p.vector} size={150} showLabels={false} className="mx-auto" />
            <p className="mt-1 text-sm font-medium">{p.label}</p>
            <p className="text-xs text-muted-foreground">{p.count} saved or cooked</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

/** "Sam loves it" / "you're fine with it". `name` is null for you. */
const verdict = (name: string | null, score: number) => {
  const you = name === null;
  if (score >= 85) return you ? 'You love it' : `${name} loves it`;
  if (score >= 75) return you ? 'you like it' : `${name} likes it`;
  if (score >= 65) return you ? 'you’re fine with it' : `${name} is fine with it`;
  return you ? 'it’s not really your thing' : `it’s not really ${name}’s thing`;
};

const sentence = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;

/** People you cook for, and dishes that suit everyone including you. */
export const Household = ({
  me,
  recipes,
  exclude,
}: {
  me: TasteVector | null;
  recipes: ProfiledRecipe[];
  exclude: Set<string>;
}) => {
  const { household, removeMember } = useTasteSettings();
  const people = useMemo(
    () => [...(me ? [{ id: 'me', name: 'You', vector: me }] : []), ...household],
    [me, household],
  );
  const picks = useMemo(
    () => (household.length ? householdPicks(people.map((p) => p.vector), recipes, exclude, 4) : []),
    [household.length, people, recipes, exclude],
  );

  return (
    <section aria-labelledby="household-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="household-title" className="text-2xl font-bold">Cooking for others</h2>
        {household.length < MAX_MEMBERS && (
          <Button asChild variant="outline" size="sm">
            <Link to="/quiz?for=new"><Plus className="mr-1.5 h-4 w-4" /> Add someone</Link>
          </Button>
        )}
      </div>
      {household.length === 0 ? (
        <p className="mt-2 max-w-xl text-muted-foreground">
          Add the people you cook for. Each takes a one-minute taste quiz on your device, then FlavorCraft suggests
          dishes everyone at the table will like, not just the average.
        </p>
      ) : (
        <>
          <ul className="mt-4 flex flex-wrap gap-2">
            {household.map((m) => (
              <li key={m.id} className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pl-3 pr-1 text-sm">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground">: {describeProfile(m.vector).replace(/^Mostly /, '').toLowerCase()}</span>
                <Link to={`/quiz?for=${m.id}`} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Retake ${m.name}'s quiz`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button type="button" onClick={() => removeMember(m.id)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${m.name}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {!me && (
            <p className="mt-3 text-sm text-muted-foreground">
              Your own taste isn’t included yet. <Link to="/quiz" className="underline underline-offset-2">Take the quiz</Link> or save a few recipes.
            </p>
          )}
          {picks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Dishes everyone will like</h3>
              <p className="text-sm text-muted-foreground">Ranked so the least keen person is still happy.</p>
              <ul className="mt-4 space-y-5">
                {picks.map((pick) => (
                  <li key={pick.recipe.id}>
                    <RecipeCard recipe={pick.recipe} layout="row" />
                    <p className="mt-1 text-sm text-muted-foreground sm:pl-[156px]">
                      {sentence(people.map((p, i) => verdict(p.id === 'me' ? null : p.name, pick.scores[i])).join(', '))}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};
