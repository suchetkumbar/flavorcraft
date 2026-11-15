import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useKitchen } from '@/lib/kitchen/store';
import { useAuth } from '@/hooks/useAuth';
import type { IngredientLine } from '@/lib/flavor/profile';

interface SaveRemixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  parentRemixId: string | null;
  defaultTitle: string;
  ingredients: IngredientLine[];
  removed: string[];
  added: string[];
  /** Called once the remix is saved, before navigating to it. */
  onSaved?: () => void;
}

const SaveRemixDialog = ({ open, onOpenChange, recipeId, parentRemixId, defaultTitle, ingredients, removed, added, onSaved }: SaveRemixDialogProps) => {
  const addRemix = useKitchen((s) => s.addRemix);
  const signedIn = useAuth((s) => s.user !== null);
  const navigate = useNavigate();
  const [title, setTitle] = useState(defaultTitle);
  const [note, setNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const remix = addRemix({
      parentRecipeId: recipeId,
      parentRemixId,
      title: title.trim(),
      note: note.trim(),
      ingredients,
      removed,
      added,
      isPublic: signedIn && isPublic,
    });
    toast.success('Remix saved');
    onSaved?.();
    onOpenChange(false);
    navigate(`/remixes/${remix.id}`);
  };

  const summary = [
    removed.length ? `without ${removed.join(', ')}` : '',
    added.length ? `with ${added.join(', ')}` : '',
  ].filter(Boolean).join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save your remix</DialogTitle>
          <DialogDescription>{summary ? `This version is ${summary}.` : 'Save this version of the recipe.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="remix-title">Name</Label>
            <Input id="remix-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remix-note">What did you change and why? (optional)</Label>
            <Textarea id="remix-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          </div>
          {signedIn ? (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--foreground))]"
              />
              <span>
                <span className="font-medium">Share publicly</span>
                <span className="block text-muted-foreground">Anyone can see it on the recipe page and fork it. You can change this later.</span>
              </span>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">Saved on this device. Sign in to keep it across devices or share it.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title.trim()}>Save remix</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveRemixDialog;
