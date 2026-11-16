import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import RecipeCard from '@/components/RecipeCard';
import RemixRow from '@/components/kitchen/RemixRow';
import FollowButton from '@/components/community/FollowButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMyTaste, useProfile, usePublicRemixesBy } from '@/hooks/useCommunity';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { sharedTastes, tasteMatch } from '@/lib/community/twins';
import { describeProfile } from '@/lib/flavor/tastes';
import type { ProfiledRecipe } from '@/lib/recipes/types';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen">
    <Navigation />
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Community
      </Link>
      {children}
    </main>
    <Footer />
  </div>
);

const Person = () => {
  const { handle } = useParams();
  const { data: person, isLoading } = useProfile(handle);
  const { data } = useCatalog();
  const me = useAuth((s) => s.user?.id);
  const { taste, average, tried } = useMyTaste();
  const ids = useMemo(() => (person ? [person.userId] : []), [person]);
  const { data: remixes = [] } = usePublicRemixesBy(ids, 30);
  useDocumentTitle(isLoading ? undefined : person ? person.displayName : 'Cook not found');

  const favorites = useMemo(() => {
    const byId = new Map((data?.recipes ?? []).map((r) => [r.id, r]));
    return (person?.favorites ?? []).map((id) => byId.get(id)).filter((r): r is ProfiledRecipe => Boolean(r));
  }, [data, person]);

  if (isLoading) {
    return (
      <Shell>
        <div className="mt-6 h-10 w-1/2 animate-pulse rounded bg-muted" />
      </Shell>
    );
  }
  if (!person) {
    return (
      <Shell>
        <h1 className="mt-6 text-3xl font-bold">This cook isn’t sharing a profile</h1>
        <p className="mt-2 max-w-md text-muted-foreground">The handle may be mistyped, or they stopped sharing.</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/community">Find other cooks</Link></Button>
      </Shell>
    );
  }

  const isMe = me === person.userId;
  const match = taste && !isMe ? tasteMatch(taste, person.taste) : null;
  const fresh = favorites.filter((r) => !tried.has(r.id));

  return (
    <Shell>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{person.displayName}</h1>
          <p className="mt-1 text-muted-foreground">@{person.handle}{isMe && ' (this is you)'}</p>
        </div>
        <FollowButton userId={person.userId} name={person.displayName} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[340px_1fr]">
        <aside>
          <div className="rounded-xl border bg-card p-5 lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold">{isMe ? 'Your taste' : 'Their taste'}</h2>
            <p className="text-sm text-muted-foreground">{describeProfile(person.taste)}.</p>
            <div className="mt-2 flex justify-center">
              <FlavorRadar values={person.taste} compare={!isMe && taste ? taste : undefined} compareLabel="your taste" size={270} />
            </div>
            {match !== null && taste && average && (
              <div className="mt-2 border-t pt-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                  Your taste
                </p>
                <p className="mt-3">
                  <span className="text-3xl font-bold tabular-nums">{match}%</span>
                  <span className="ml-2 text-muted-foreground">match with you</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{sharedTastes(taste, person.taste, average)}.</p>
              </div>
            )}
            {!taste && !isMe && (
              <p className="mt-3 border-t pt-4 text-sm text-muted-foreground">
                <Link to="/quiz" className="underline underline-offset-2">Take the taste quiz</Link> to see how close your palates are.
              </p>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <section aria-labelledby="favorites-title">
            <h2 id="favorites-title" className="text-2xl font-bold">Dishes {isMe ? 'you' : 'they'} rate</h2>
            {favorites.length === 0 ? (
              <p className="mt-1 text-muted-foreground">Nothing rated or saved yet.</p>
            ) : (
              <>
                {!isMe && (
                  <p className="mt-1 text-muted-foreground">
                    {fresh.length === 0
                      ? 'You’ve already saved or cooked all of these.'
                      : `${fresh.length} of ${favorites.length} you haven’t tried yet.`}
                  </p>
                )}
                <ul className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                  {favorites.map((r) => (
                    <li key={r.id}>
                      <RecipeCard recipe={r} />
                      {!isMe && !tried.has(r.id) && <p className="mt-1 text-xs font-medium">New to you</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="mt-12" aria-labelledby="remixes-title">
            <h2 id="remixes-title" className="text-2xl font-bold">Shared remixes</h2>
            {remixes.length === 0 ? (
              <p className="mt-1 text-muted-foreground">No public remixes yet.</p>
            ) : (
              <ul className="mt-2 divide-y border-y">
                {remixes.map((r) => (
                  <li key={r.id}><RemixRow remix={r} mine={isMe} /></li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
};

export default Person;
