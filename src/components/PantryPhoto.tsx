import { useState } from 'react';
import { toast } from 'sonner';
import PhotoPicker from '@/components/PhotoPicker';
import { Button } from '@/components/ui/button';
import { readPantryPhoto } from '@/lib/kitchen/assistant';
import { cleanNames, type PreparedPhoto } from '@/lib/kitchen/photo';
import { canonicalName } from '@/lib/flavor/pairings';
import { cn } from '@/lib/utils';

interface PantryPhotoProps {
  /** Canonical names already in the pantry, so they aren't offered again. */
  have: Set<string>;
  signedIn: boolean;
  onSignIn: () => void;
  onAdd: (names: string[]) => void;
}

/**
 * Fills the pantry from a photo of a fridge, a shelf or the shopping. Nothing
 * is added until the cook has looked over what was spotted.
 */
const PantryPhoto = ({ have, signedIn, onSignIn, onAdd }: PantryPhotoProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState<string[] | null>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());

  const read = async (photo: PreparedPhoto) => {
    setBusy(true);
    setError('');
    setFound(null);
    try {
      const fresh = cleanNames(await readPantryPhoto(photo)).filter((n) => !have.has(canonicalName(n)));
      setFound(fresh);
      setSkip(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const chosen = (found ?? []).filter((n) => !skip.has(n));

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex flex-wrap items-center gap-3">
        {signedIn ? (
          <PhotoPicker label="Add from a photo" busyLabel="Looking at the photo…" busy={busy} variant="outline" size="sm" onPhoto={read} onError={setError} />
        ) : (
          <Button variant="outline" size="sm" onClick={onSignIn}>Sign in to add from a photo</Button>
        )}
        <span className="text-sm text-muted-foreground">
          Photograph your fridge, a shelf or your shopping. The photo is read by Google’s Gemini and not saved.
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}

      <div aria-live="polite">
        {found && found.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Nothing new was spotted. Try a closer, brighter photo, or type the items in.</p>
        )}
        {found && found.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium">Spotted {found.length}. Turn off anything that’s wrong.</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {found.map((name) => {
                const on = !skip.has(name);
                return (
                  <li key={name}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSkip((prev) => {
                          const next = new Set(prev);
                          if (on) next.add(name);
                          else next.delete(name);
                          return next;
                        })
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm capitalize transition-colors',
                        on ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground line-through hover:bg-muted',
                      )}
                    >
                      {name}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={chosen.length === 0}
                onClick={() => {
                  onAdd(chosen);
                  toast.success(`Added ${chosen.length} to your pantry`);
                  setFound(null);
                }}
              >
                Add {chosen.length} to my pantry
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFound(null)}>Discard</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PantryPhoto;
