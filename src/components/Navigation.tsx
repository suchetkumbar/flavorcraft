import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import AuthDialog from './kitchen/AuthDialog';
import { LogIn, LogOut } from 'lucide-react';
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
                  'whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted sm:px-3',
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          {accountsEnabled && ready && (
            user ? (
              <Button variant="ghost" size="sm" className="shrink-0 px-2 text-muted-foreground sm:px-3" onClick={() => signOut()} title={user.email} aria-label="Sign out">
                <LogOut className="h-4 w-4 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="ml-1 shrink-0 px-2 sm:px-3" onClick={() => setAuthOpen(true)} aria-label="Sign in">
                <LogIn className="h-4 w-4 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">Sign in</span>
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
