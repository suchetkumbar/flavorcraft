import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { askForFix, type AiFix } from '@/lib/kitchen/assistant';
import type { DishProblem } from '@/lib/flavor/fixes';
import type { IngredientLine } from '@/lib/flavor/profile';
import type { TasteVector } from '@/lib/flavor/tastes';

interface AiFixPanelProps {
  recipeTitle: string;
  ingredients: IngredientLine[];
  steps: string[];
  problem: DishProblem;
  profile: TasteVector;
  signedIn: boolean;
  onSignIn: () => void;
}

/** Asks the assistant for fixes specific to this dish, below the rule-based ones. */
const AiFixPanel = ({ recipeTitle, ingredients, steps, problem, profile, signedIn, onSignIn }: AiFixPanelProps) => {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [result, setResult] = useState<AiFix | null>(null);
  const [error, setError] = useState('');

  const ask = async () => {
    setStatus('loading');
    setError('');
    try {
      setResult(await askForFix({ recipeTitle, ingredients, steps, problem, profile }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setStatus('idle');
    }
  };

  if (!result) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {signedIn ? (
          <Button variant="outline" onClick={ask} disabled={status === 'loading'}>
            <Sparkles className="mr-2 h-4 w-4" />
            {status === 'loading' ? 'Reading the recipe…' : 'Get advice for this exact recipe'}
          </Button>
        ) : (
          <Button variant="outline" onClick={onSignIn}>
            <Sparkles className="mr-2 h-4 w-4" /> Sign in for advice on this exact recipe
          </Button>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border bg-card p-4" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4" aria-hidden /> Advice for this recipe
      </p>
      <p className="mt-2">{result.diagnosis}</p>
      <ol className="mt-3 space-y-3">
        {result.steps.map((s, i) => (
          <li key={i} className="text-sm">
            <p className="font-semibold">{i + 1}. {s.action}</p>
            <p><span className="font-medium">How much: </span>{s.amount}</p>
            <p><span className="font-medium">When: </span>{s.when}</p>
            <p className="text-muted-foreground">{s.why}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">AI-generated. Taste as you go.</p>
    </div>
  );
};

export default AiFixPanel;
