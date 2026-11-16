import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCatalog } from '@/hooks/useRecipes';
import { describeDish } from '@/lib/kitchen/assistant';
import { cleanNames } from '@/lib/kitchen/photo';
import type { IngredientLine } from '@/lib/flavor/profile';
import { describedTarget, findTarget, planToward, type TastePlan, type TasteTarget } from '@/lib/flavor/tasteLike';
import { accountsEnabled } from '@/lib/supabase';

interface TasteLikePanelProps {
  recipeId: string;
  /** The ingredient list as it stands, including remix edits. */
  ingredients: IngredientLine[];
  signedIn: boolean;
  onSignIn: () => void;
  /** Applies the plan's steps to the remix being edited. */
  onApply: (plan: TastePlan) => void;
}

const list = (words: string[]) => (words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

/**
 * "Make it taste like…": name a dish or a cuisine and get a few changes that
 * move this recipe toward it. The catalog answers when it can; the assistant
 * is only asked what an unknown dish is made of, and the plan is always
 * computed here from ingredients.
 */
const TasteLikePanel = ({ recipeId, ingredients, signedIn, onSignIn, onApply }: TasteLikePanelProps) => {
  const { data } = useCatalog();
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState('');
  const [target, setTarget] = useState<TasteTarget | null>(null);
  const [status, setStatus] = useState<'idle' | 'unknown' | 'asking'>('idle');
  const [error, setError] = useState('');

  const plan = useMemo(() => (target ? planToward(ingredients, target) : null), [target, ingredients]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || !data) return;
    setError('');
    setAsked(q);
    const found = findTarget(q, data.recipes, recipeId);
    setTarget(found);
    setStatus(found ? 'idle' : 'unknown');
  };

  const askAssistant = async () => {
    setStatus('asking');
    setError('');
    try {
      const answer = await describeDish(asked);
      const made = answer.known ? describedTarget(answer.dish || asked, cleanNames(answer.ingredients, 12)) : null;
      if (made) {
        setTarget(made);
        setStatus('idle');
      } else {
        setStatus('unknown');
        setError(`The assistant doesn’t know “${asked}” well enough to plan from. Try a dish or a cuisine by its usual name.`);
      }
    } catch (err) {
      setStatus('unknown');
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <section className="mt-12" aria-labelledby="taste-like">
      <h2 id="taste-like" className="text-2xl font-bold">Make it taste like…</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Name a dish or a cuisine. You’ll get a few changes that move this recipe toward it, without turning it into a different dinner.
      </p>
      <form onSubmit={submit} className="mt-3 flex max-w-md gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Thai, carbonara, more Mexican"
          aria-label="A dish or cuisine to move toward"
          maxLength={80}
        />
        <Button type="submit" variant="outline" disabled={!query.trim() || !data}>Plan it</Button>
      </form>

      <div aria-live="polite">
        {status !== 'idle' && !target && (
          <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
            <p>
              <span className="font-medium">“{asked}” isn’t in the recipe catalog.</span>{' '}
              {accountsEnabled ? 'The assistant can say what it’s made of, and the plan is worked out from that.' : 'Try a cuisine, or a dish by its usual name.'}
            </p>
            {accountsEnabled && (
              <Button variant="outline" size="sm" className="mt-3" onClick={signedIn ? askAssistant : onSignIn} disabled={status === 'asking'}>
                <Sparkles className="mr-2 h-4 w-4" />
                {status === 'asking' ? 'Asking…' : signedIn ? 'Ask the assistant' : 'Sign in to ask the assistant'}
              </Button>
            )}
            {error && <p className="mt-2 text-destructive" role="alert">{error}</p>}
          </div>
        )}

        {target && plan && (
          <div className="mt-4 rounded-lg border bg-card p-4">
            <p className="font-medium">
              Toward {target.label}
              {target.kind === 'described' && <span className="ml-2 text-sm font-normal text-muted-foreground">ingredients named by the assistant</span>}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {target.kind === 'cuisine'
                ? `From ${target.basedOn} savory ${target.label.replace(' cooking', '')} recipes. It leans on ${list(target.signature.slice(0, 6))}.`
                : `It gets its taste from ${list(target.signature.slice(0, 6))}.`}
            </p>
            {plan.steps.length === 0 ? (
              <p className="mt-3 text-sm">
                {plan.before >= 80
                  ? 'This already tastes close to it. Nothing worth changing.'
                  : 'No small change gets it meaningfully closer. It would need to be a different dish.'}
              </p>
            ) : (
              <>
                <ol className="mt-3 space-y-2">
                  {plan.steps.map((s, i) => (
                    <li key={`${s.kind}-${s.name}`} className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm">
                      <span className="font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                      <span>
                        <span className="font-medium">{s.kind === 'add' ? 'Add' : 'Leave out the'} {s.name.toLowerCase()}</span>
                        <span className="text-muted-foreground">: {s.effect.toLowerCase()}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-sm">
                  Closeness to {target.label}: <span className="font-semibold tabular-nums">{plan.before}%</span> now,{' '}
                  <span className="font-semibold tabular-nums">{plan.after}%</span> after.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={() => onApply(plan)}>Apply to my remix</Button>
                  <span className="text-sm text-muted-foreground">You can undo any of it in the ingredient list.</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TasteLikePanel;
