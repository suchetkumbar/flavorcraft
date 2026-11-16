import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buildQuizRounds, quizResult, type QuizAnswer } from '@/lib/kitchen/quiz';
import { useTasteSettings } from '@/lib/kitchen/settings';
import { describeProfile } from '@/lib/flavor/tastes';
import type { ProfiledRecipe } from '@/lib/recipes/types';
import { cn } from '@/lib/utils';

const DishChoice = ({ recipe, onPick }: { recipe: ProfiledRecipe; onPick: () => void }) => (
  <button
    type="button"
    onClick={onPick}
    className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-foreground focus-visible:outline-offset-4"
  >
    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
      {recipe.image && (
        <img src={`${recipe.image}/medium`} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      )}
    </div>
    <span className="p-4">
      <span className="block text-lg font-semibold leading-snug">{recipe.title}</span>
      <span className="mt-0.5 block text-sm text-muted-foreground">
        {recipe.area !== 'Unknown' ? `${recipe.area} ${recipe.category.toLowerCase()}` : recipe.category}
      </span>
    </span>
  </button>
);

const Quiz = () => {
  const { data, isLoading } = useCatalog();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const forId = params.get('for'); // a household member's id, or "new"
  const { household, setQuiz, saveMember } = useTasteSettings();
  const member = forId && forId !== 'new' ? household.find((m) => m.id === forId) : undefined;
  const forSomeone = Boolean(forId);
  useDocumentTitle(forSomeone ? 'Taste quiz for someone else' : 'Taste quiz');

  const rounds = useMemo(() => (data ? buildQuizRounds(data.recipes) : []), [data]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [name, setName] = useState(member?.name ?? '');
  const [started, setStarted] = useState(!forSomeone);

  const step = answers.length;
  const done = rounds.length > 0 && step >= rounds.length;
  const result = done ? quizResult(rounds, answers) : null;
  const answer = (a: QuizAnswer) => setAnswers((prev) => [...prev, a]);

  const save = () => {
    if (!result) return;
    if (forSomeone) {
      saveMember({ id: member?.id ?? crypto.randomUUID(), name: name.trim() || 'Someone', vector: result });
      toast.success(`Saved ${name.trim() || 'their'} taste profile`);
    } else {
      setQuiz(result);
      toast.success('Your taste profile is ready');
    }
    navigate('/kitchen');
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {!started ? (
          <form
            className="max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              setStarted(true);
            }}
          >
            <h1 className="text-4xl font-bold">Who’s this quiz for?</h1>
            <p className="mt-2 text-muted-foreground">
              Hand them your phone, or ask them each question. Their answers stay in your kitchen and help pick dishes everyone will like.
            </p>
            <div className="mt-6 space-y-2">
              <Label htmlFor="member-name">Their name</Label>
              <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus />
            </div>
            <Button type="submit" className="mt-4" disabled={!name.trim()}>Start the quiz</Button>
          </form>
        ) : isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        ) : rounds.length === 0 ? (
          <p className="text-muted-foreground">The quiz needs the full recipe catalog, which couldn’t be loaded. Check your connection and reload.</p>
        ) : !done ? (
          <section aria-live="polite">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-bold sm:text-4xl">
                {forSomeone ? `Which would ${name.trim() || 'they'} rather eat?` : 'Which would you rather eat?'}
              </h1>
              <p className="shrink-0 text-sm text-muted-foreground">{step + 1} of {rounds.length}</p>
            </div>
            <div className="mt-2 h-1 rounded-full bg-border" aria-hidden>
              <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${(step / rounds.length) * 100}%` }} />
            </div>
            {/* Swap sides every other round so always picking the left one doesn't skew the result. */}
            <div className={cn('mt-8 grid gap-4 sm:grid-cols-2', step % 2 === 1 && '[&>*:first-child]:order-last')}>
              <DishChoice recipe={rounds[step].high} onPick={() => answer('high')} />
              <DishChoice recipe={rounds[step].low} onPick={() => answer('low')} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => answer('both')}>I’d happily eat either</Button>
              <Button variant="ghost" onClick={() => answer('neither')}>Neither appeals</Button>
              {step > 0 && (
                <Button variant="ghost" onClick={() => setAnswers((prev) => prev.slice(0, -1))}>Back</Button>
              )}
            </div>
          </section>
        ) : result ? (
          <section className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold">{forSomeone ? `${name.trim()}’s taste` : 'Your taste'}</h1>
              <p className="mt-3 text-lg">{describeProfile(result)}.</p>
              <p className="mt-2 text-muted-foreground">
                {forSomeone
                  ? 'Saved in your kitchen, it helps pick dishes that suit everyone at the table.'
                  : 'This starts your taste profile. Every recipe you save or cook refines it, and soon outweighs the quiz.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" onClick={save}>{forSomeone ? `Save for ${name.trim()}` : 'Save to My Kitchen'}</Button>
                <Button size="lg" variant="ghost" onClick={() => setAnswers([])}>Retake</Button>
              </div>
            </div>
            <div className="flex justify-center">
              <FlavorRadar values={result} size={320} />
            </div>
          </section>
        ) : (
          <section>
            <h1 className="text-3xl font-bold">Nothing appealed</h1>
            <p className="mt-2 text-muted-foreground">Without at least one pick there’s nothing to learn from. Try again, or start by saving recipes you like.</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => setAnswers([])}>Retake the quiz</Button>
              <Button variant="outline" asChild><Link to="/recipes">Browse recipes</Link></Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Quiz;
