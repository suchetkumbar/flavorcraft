import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendSignInLink } from '@/hooks/useAuth';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('sending');
    try {
      await sendSignInLink(email.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      const message = err instanceof Error ? err.message : '';
      setError(
        /rate limit/i.test(message)
          ? 'Too many sign-in emails were sent recently. Wait a few minutes and try again.'
          : 'The sign-in link couldn’t be sent. Check the email address and try again.',
      );
    }
  };

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setStatus('idle');
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {status === 'sent' ? (
          <DialogHeader>
            <DialogTitle>Check your email</DialogTitle>
            <DialogDescription>
              We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Open it on this
              device to finish signing in. Anything you’ve saved here will move into your account.
            </DialogDescription>
          </DialogHeader>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Sign in to FlavorCraft</DialogTitle>
              <DialogDescription>
                Keep your saved recipes, remixes and cooking log across devices. No password: we’ll email you a link.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={error ? 'email-error' : undefined}
                />
                {error && (
                  <p id="email-error" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={status === 'sending' || !email.trim()}>
                {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
