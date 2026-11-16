import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PROBLEMS, type DishProblem } from '@/lib/flavor/fixes';
import { useKitchen } from '@/lib/kitchen/store';
import { cn } from '@/lib/utils';

interface CookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  remixId?: string | null;
  title: string;
  /** Called after an entry is added (not on cancel). */
  onLogged?: () => void;
  /** Problems already noticed while cooking (taste checkpoints); pre-selected, and the cook can untick them. */
  initialProblems?: DishProblem[];
}

const CookDialog = ({ open, onOpenChange, recipeId, remixId = null, title, onLogged, initialProblems }: CookDialogProps) => {
  const logCook = useKitchen((s) => s.logCook);
  const [rating, setRating] = useState<number | null>(null);
  const [problems, setProblems] = useState<DishProblem[]>([]);
  const [note, setNote] = useState('');

  // Start from what was noticed mid-cook each time the dialog opens.
  const noticed = initialProblems?.join(',') ?? '';
  useEffect(() => {
    if (open) setProblems(noticed ? (noticed.split(',') as DishProblem[]) : []);
  }, [open, noticed]);

  const toggleProblem = (p: DishProblem) =>
    setProblems((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    logCook({ recipeId, remixId, rating, problems, note: note.trim() });
    toast.success('Added to your cooking log');
    onOpenChange(false);
    setRating(null);
    setProblems([]);
    setNote('');
    onLogged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How did it turn out?</DialogTitle>
          <DialogDescription>
            Logging {title} shapes your taste profile. Anything you mark as off steers future suggestions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset>
            <legend className="text-sm font-medium">Rating</legend>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  aria-label={`${n} out of 5`}
                  aria-pressed={rating !== null && n <= rating}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Star className={cn('h-6 w-6', rating !== null && n <= rating ? 'fill-foreground text-foreground' : 'text-muted-foreground')} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Anything off? (optional)</legend>
            {noticed && <p className="mt-1 text-sm text-muted-foreground">Already ticked: what you noticed when tasting. Untick anything you don’t want remembered.</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {PROBLEMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={problems.includes(p.id)}
                  onClick={() => toggleProblem(p.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    problems.includes(p.id) ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="cook-note">Note (optional)</Label>
            <Textarea
              id="cook-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="e.g. Doubled the garlic, needed 10 more minutes"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add to cooking log</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CookDialog;
