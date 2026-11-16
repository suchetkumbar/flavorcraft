import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useMyTaste } from '@/hooks/useCommunity';
import { deleteProfile, HANDLE_TAKEN, saveProfile } from '@/lib/community/remote';
import { handleProblem, suggestHandle, type PublicProfile } from '@/lib/community/twins';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The profile being edited, or null when sharing for the first time. */
  current: PublicProfile | null;
}

/** Share, edit or stop sharing your taste profile. Sharing is always a choice made here. */
const ProfileDialog = ({ open, onOpenChange, current }: ProfileDialogProps) => {
  const userId = useAuth((s) => s.user?.id);
  const { taste, favorites } = useMyTaste();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleEdited, setHandleEdited] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(current?.displayName ?? '');
    setHandle(current?.handle ?? '');
    setHandleEdited(Boolean(current));
    setError('');
    setConfirmStop(false);
  }, [open, current]);

  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['my-profile'] }),
      client.invalidateQueries({ queryKey: ['profiles'] }),
      client.invalidateQueries({ queryKey: ['authors'] }),
      client.invalidateQueries({ queryKey: ['profile'] }),
    ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taste) return;
    const problem = handleProblem(handle);
    if (problem) return setError(problem);
    setError('');
    setBusy(true);
    try {
      await saveProfile({ handle, displayName: name, taste, favorites });
      await refresh();
      toast.success(current ? 'Profile updated' : 'Your taste profile is now shared');
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error && err.message === HANDLE_TAKEN
          ? 'That handle is taken. Try another.'
          : 'Couldn’t save your profile. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await deleteProfile(userId);
      await refresh();
      toast.success('Your profile is no longer shared');
      onOpenChange(false);
    } catch {
      setError('Couldn’t remove your profile. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {confirmStop ? (
          <>
            <DialogHeader>
              <DialogTitle>Stop sharing your profile?</DialogTitle>
              <DialogDescription>
                Your name, taste profile and favorite dishes are removed for everyone, and anyone following you stops.
                Remixes you made public stay public without your name; make them private from each remix’s page.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmStop(false)} disabled={busy}>Keep sharing</Button>
              <Button variant="destructive" onClick={stop} disabled={busy}>{busy ? 'Removing…' : 'Stop sharing'}</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{current ? 'Your shared profile' : 'Share your taste profile'}</DialogTitle>
              <DialogDescription>
                Other cooks can find you by how alike your palates are, and see the dishes you rate.
              </DialogDescription>
            </DialogHeader>
            {!taste ? (
              <p className="text-sm">
                You don’t have a taste profile yet. Take the taste quiz or save a few recipes first, then come back.
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    required
                    maxLength={40}
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!handleEdited) setHandle(suggestHandle(e.target.value));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-handle">Handle</Label>
                  <Input
                    id="profile-handle"
                    required
                    maxLength={24}
                    autoCapitalize="none"
                    spellCheck={false}
                    value={handle}
                    onChange={(e) => {
                      setHandle(e.target.value.toLowerCase());
                      setHandleEdited(true);
                    }}
                    aria-describedby="profile-handle-help"
                  />
                  <p id="profile-handle-help" className="text-sm text-muted-foreground">
                    Your page will be at /people/{handle || 'your_handle'}
                  </p>
                </div>
                <div className="rounded-lg border px-4 py-3 text-sm">
                  <p className="font-medium">Anyone can see</p>
                  <p className="text-muted-foreground">
                    Your name and handle, your taste chart, and up to 12 dishes you saved or rated 4 or 5. These update
                    as you cook.
                  </p>
                  <p className="mt-2 font-medium">Never shared</p>
                  <p className="text-muted-foreground">
                    Your email, cooking log and notes, pantry, the people you cook for, and private remixes.
                  </p>
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {current ? (
                    <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmStop(true)}>
                      Stop sharing
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button type="submit" disabled={busy || !name.trim() || !handle}>
                    {busy ? 'Saving…' : current ? 'Save changes' : 'Share my profile'}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
