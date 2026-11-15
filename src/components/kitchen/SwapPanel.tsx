import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { suggestSwaps, type SwapOption } from '@/lib/kitchen/assistant';
import type { IngredientLine } from '@/lib/flavor/profile';

interface SwapPanelProps {
  recipeTitle: string;
  ingredients: IngredientLine[];
  ingredient: string;
  onUse: (option: SwapOption) => void;
  onClose: () => void;
}

/** Inline panel under an ingredient row: asks the assistant for substitutes. */
const SwapPanel = ({ recipeTitle, ingredients, ingredient, onUse, onClose }: SwapPanelProps) => {
  const [goal, setGoal] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [options, setOptions] = useState<SwapOption[]>([]);
  const [error, setError] = useState('');

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      setOptions(await suggestSwaps({ recipeTitle, ingredients, ingredient, goal }));
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setStatus('idle');
    }
  };

  return (
    <div className="mb-3 rounded-lg border bg-card p-4">
      <form onSubmit={ask} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          maxLength={120}
          placeholder="Why swap it? e.g. dairy-free, don't have it, less heat"
          aria-label={`Reason for swapping ${ingredient} (optional)`}
          className="flex-1"
        />
        <Button type="submit" disabled={status === 'loading'}>
          <Sparkles className="mr-2 h-4 w-4" />
          {status === 'loading' ? 'Thinking…' : `Suggest swaps for ${ingredient}`}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
      {status === 'done' && options.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">No good swaps came back. Try describing why you want to swap it.</p>
      )}
      {options.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {options.map((o) => (
            <li key={o.use} className="flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {o.use} <span className="font-normal text-muted-foreground">{o.amount}</span>
                </p>
                <p className="text-sm">{o.why}</p>
                <p className="text-sm text-muted-foreground">{o.tasteShift}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onUse(o)}>Use this</Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Suggestions are AI-generated. Check allergies and quantities yourself.</p>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

export default SwapPanel;
