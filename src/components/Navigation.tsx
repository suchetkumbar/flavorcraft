import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import AuthDialog from './kitchen/AuthDialog';
import { Button } from './ui/button';
import { accountsEnabled } from '@/lib/supabase';
import { signOut, useAuth } from '@/hooks/useAuth';

const links = [
  { to: '/recipes', label: 'Recipes' },
  { to: '/pairings', label: 'Pairings' },
  { to: '/kitchen', label: 'My Kitchen' },
];

const Navigation = () => {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight">
          <Logo />
          <span className="hidden sm:inline">FlavorCraft</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted sm:px-3',
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          {accountsEnabled && ready && (
            user ? (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => signOut()} title={user.email}>
                Sign out
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="ml-1" onClick={() => setAuthOpen(true)}>
                Sign in
              </Button>
            )
          )}
        </nav>
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
};

export default Navigation;
