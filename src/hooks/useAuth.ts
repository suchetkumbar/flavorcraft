import { useEffect } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { syncAfterSignIn, useKitchen } from '@/lib/kitchen/store';
import { syncPantryAfterSignIn, usePantry } from '@/lib/pantry/store';

interface AuthState {
  user: User | null;
  ready: boolean;
  syncing: boolean;
}

export const useAuth = create<AuthState>(() => ({ user: null, ready: !supabase, syncing: false }));

const sync = async (user: User) => {
  useAuth.setState({ syncing: true });
  try {
    await Promise.all([syncAfterSignIn(user.id), syncPantryAfterSignIn(user.id)]);
  } catch {
    toast.error('Couldn’t load your kitchen from your account', {
      description: 'What you see is saved on this device. Reload the page to try again.',
    });
  } finally {
    useAuth.setState({ syncing: false });
  }
};

/** Mount once near the app root. Keeps auth state and the kitchen in step. */
export const useAuthListener = () => {
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      useAuth.setState({ user, ready: true });
      if (event === 'SIGNED_OUT') {
        useKitchen.getState().reset();
        usePantry.getState().reset();
        return;
      }
      // Defer Supabase calls out of the auth callback, as the client docs advise.
      if (user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) setTimeout(() => sync(user), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
};

export const sendSignInLink = async (email: string) => {
  if (!supabase) throw new Error('Accounts are not configured');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/kitchen` },
  });
  if (error) throw error;
};

export const signOut = async () => {
  await supabase?.auth.signOut();
};
