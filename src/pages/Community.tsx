import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorBand from '@/components/flavor/FlavorBand';
import AuthDialog from '@/components/kitchen/AuthDialog';
import FollowButton from '@/components/community/FollowButton';
import ProfileDialog from '@/components/community/ProfileDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useAuthors,
  useEntries,
  useFollowing,
  useKeepProfileFresh,
  useMyProfile,
  useMyTaste,
  useProfiles,
  usePublicRemixesBy,
} from '@/hooks/useCommunity';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { challengeFor, timeLeft } from '@/lib/community/challenges';
import { rankTwins } from '@/lib/community/twins';
import { computeProfile } from '@/lib/flavor/profile';
import { accountsEnabled } from '@/lib/supabase';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const Community = () => {
  useDocumentTitle('Community');
  useKeepProfileFresh();
  const { data } = useCatalog();
  const user = useAuth((s) => s.user);
  const { taste, average } = useMyTaste();
  const { data: mine } = useMyProfile();
  const { data: profiles, isLoading: profilesLoading, isError: profilesFailed } = useProfiles();
  const { data: following = [] } = useFollowing();
  const { data: feed = [] } = usePublicRemixesBy(following, 12);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const challenge = useMemo(() => (data?.online ? challengeFor(new Date(), data.recipes) : null), [data]);
  const { data: entries } = useEntries(challenge?.key);
  const twins = useMemo(
    () => (taste && average && profiles ? rankTwins(taste, profiles, average, user?.id) : []),
    [taste, average, profiles, user],
  );
  const feedAuthors = useAuthors(feed.map((r) => r.userId));
  const titles = useMemo(() => new Map((data?.recipes ?? []).map((r) => [r.id, r.title])), [data]);
  const others = (profiles ?? []).filter((p) => p.userId !== user?.id);

  if (!accountsEnabled) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="text-4xl font-bold sm:text-5xl">Community</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Challenges and shared profiles need accounts, which aren’t set up on this copy of FlavorCraft. Everything
            else works without them.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Community</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          One remix challenge a week, and cooks whose taste is close to yours.
        </p>

        {challenge && (
          <section className="mt-10 rounded-xl border bg-foreground px-6 py-6 text-background" aria-labelledby="challenge-title">
            <p className="text-sm text-background/70">This week’s challenge, {timeLeft(challenge.endsAt, new Date()).toLowerCase()}</p>
            <h2 id="challenge-title" className="mt-1 text-3xl font-bold">{challenge.brief.title}</h2>
            <p className="mt-2 max-w-2xl text-background/85">
              {challenge.brief.brief} Starting from <span className="font-semibold text-background">{challenge.recipe.title}</span>.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button asChild variant="secondary"><Link to="/challenge">See the challenge</Link></Button>
              {entries && (
                <span className="text-sm text-background/70">
                  {entries.length === 0 ? 'No entries yet. Yours could be the first.' : `${plural(entries.length, 'entry', 'entries')} so far`}
                </span>
              )}
            </div>
          </section>
        )}

        <section className="mt-14" aria-labelledby="twins-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="twins-title" className="text-2xl font-bold">Cooks with your taste</h2>
              <p className="mt-1 max-w-xl text-muted-foreground">
                Ranked by how close their taste profile is to yours. What they rate highly is a good bet for you.
              </p>
            </div>
            {user ? (
              <Button variant={mine ? 'outline' : 'default'} onClick={() => setProfileOpen(true)}>
                {mine ? `Shared as @${mine.handle}` : 'Share my taste profile'}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setAuthOpen(true)}>Sign in to share yours</Button>
            )}
          </div>

          {!taste ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">You need a taste profile before anyone can be matched to it.</p>
              <p className="mt-1 text-muted-foreground">Eight quick choices is enough.</p>
              <Button asChild className="mt-4"><Link to="/quiz">Take the taste quiz</Link></Button>
            </div>
          ) : profilesLoading ? (
            <div className="mt-6 h-32 animate-pulse rounded-lg bg-muted" />
          ) : profilesFailed ? (
            <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              Couldn’t load other cooks. Check your connection and reload the page.
            </p>
          ) : others.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{mine ? 'You’re the first cook here.' : 'Nobody has shared a taste profile yet.'}</p>
              <p className="mt-1 text-muted-foreground">
                {mine ? 'As others share theirs, the closest matches will show up here.' : 'Share yours and be the first.'}
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {twins.map(({ profile: p, match, shared }) => (
                <li key={p.userId} className="flex flex-col rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/people/${p.handle}`} className="min-w-0 hover:underline hover:underline-offset-4">
                      <span className="block truncate text-lg font-semibold">{p.displayName}</span>
                      <span className="block truncate text-sm text-muted-foreground">@{p.handle}</span>
                    </Link>
                    <span className="shrink-0 text-right">
                      <span className="block text-2xl font-bold tabular-nums leading-none">{match}%</span>
                      <span className="text-xs text-muted-foreground">match</span>
                    </span>
                  </div>
                  <FlavorBand values={p.taste} className="mt-3" />
                  <p className="mt-3 text-sm text-muted-foreground">{shared}.</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <Link to={`/people/${p.handle}`} className="text-sm font-medium underline underline-offset-2">
                      {p.favorites.length ? `See ${plural(p.favorites.length, 'dish', 'dishes')} they rate` : 'See their profile'}
                    </Link>
                    <FollowButton userId={p.userId} name={p.displayName} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {user && following.length > 0 && (
          <section className="mt-14" aria-labelledby="feed-title">
            <h2 id="feed-title" className="text-2xl font-bold">New from cooks you follow</h2>
            {feed.length === 0 ? (
              <p className="mt-1 text-muted-foreground">They haven’t shared any remixes yet.</p>
            ) : (
              <ul className="mt-2 divide-y border-y">
                {feed.map((r) => {
                  const author = r.userId ? feedAuthors.get(r.userId) : undefined;
                  return (
                    <li key={r.id} className="py-3">
                      <Link to={`/remixes/${r.id}`} className="group block">
                        <span className="font-medium group-hover:underline group-hover:underline-offset-4">{r.title}</span>
                        <span className="block text-sm text-muted-foreground">
                          {author ? `${author.displayName}’s remix` : 'A remix'} of {titles.get(r.parentRecipeId) ?? 'a recipe'}
                        </span>
                        <FlavorBand values={computeProfile(r.ingredients).vector} className="mt-2 h-1" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
      <Footer />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} current={mine ?? null} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Community;
