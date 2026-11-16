import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Check, ThumbsUp, X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FlavorBand from '@/components/flavor/FlavorBand';
import RecipeCard from '@/components/RecipeCard';
import AuthDialog from '@/components/kitchen/AuthDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthors, useEntries, useMyVotes } from '@/hooks/useCommunity';
import { useCatalog } from '@/hooks/useRecipes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { challengeFor, judge, previousWeek, rankEntries, timeLeft, type Challenge as WeeklyChallenge, type Verdict } from '@/lib/community/challenges';
import { enterChallenge, unvote, vote, withdrawEntry, type ChallengeEntry } from '@/lib/community/remote';
import { changeWords, tasteChanges } from '@/lib/community/tree';
import { computeProfile } from '@/lib/flavor/profile';
import { updateRemix } from '@/lib/kitchen/remote';
import { useKitchen } from '@/lib/kitchen/store';
import type { Remix } from '@/lib/kitchen/types';
import { accountsEnabled } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const Checks = ({ verdict }: { verdict: Verdict }) => (
  <ul className="mt-2 space-y-1 text-sm">
    {verdict.checks.map((c) => (
      <li key={c.label} className="flex items-start gap-2">
        {c.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />}
        <span>
          <span className="sr-only">{c.ok ? 'Met: ' : 'Not met: '}</span>
          <span className={cn(!c.ok && 'font-medium')}>{c.label}</span>
          <span className="text-muted-foreground"> ({c.detail})</span>
        </span>
      </li>
    ))}
  </ul>
);

const useRanked = (challenge: WeeklyChallenge | null) => {
  const { data: entries, isLoading, isError } = useEntries(challenge?.key);
  const ranked = useMemo(() => {
    if (!challenge || !entries) return [];
    return rankEntries(
      entries
        .filter((e) => e.remix.parentRecipeId === challenge.recipe.id)
        .map((entry) => ({ entry, verdict: judge(challenge.brief, challenge.recipe, entry.remix.ingredients) })),
    );
  }, [challenge, entries]);
  return { ranked, isLoading, isError };
};

const Challenge = () => {
  useDocumentTitle('This week’s challenge');
  const { data, isLoading: catalogLoading } = useCatalog();
  const user = useAuth((s) => s.user);
  const myRemixes = useKitchen((s) => s.remixes);
  const editRemix = useKitchen((s) => s.editRemix);
  const client = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const challenge = useMemo(() => (data?.online ? challengeFor(now, data.recipes) : null), [data, now]);
  const last = useMemo(() => (data?.online ? challengeFor(previousWeek(now), data.recipes) : null), [data, now]);
  const { ranked, isLoading: entriesLoading, isError: entriesFailed } = useRanked(challenge);
  const { ranked: lastRanked } = useRanked(last);
  const authors = useAuthors([...ranked, ...lastRanked].map((r) => r.entry.userId));
  const { data: myVotes = [] } = useMyVotes(ranked.map((r) => r.entry.id));

  const attempts = useMemo(
    () =>
      challenge
        ? myRemixes
            .filter((r) => r.parentRecipeId === challenge.recipe.id)
            .map((remix) => ({ remix, verdict: judge(challenge.brief, challenge.recipe, remix.ingredients) }))
            .sort((a, b) => Number(b.verdict.met) - Number(a.verdict.met) || b.remix.createdAt.localeCompare(a.remix.createdAt))
        : [],
    [challenge, myRemixes],
  );
  const myEntry = ranked.find((r) => r.entry.userId === user?.id)?.entry;
  const refresh = () => client.invalidateQueries({ queryKey: ['challenge-entries'] });

  const act = async (id: string, work: () => Promise<unknown>, done: string, failed: string) => {
    setBusy(id);
    try {
      await work();
      await Promise.all([refresh(), client.invalidateQueries({ queryKey: ['challenge-votes'] })]);
      toast.success(done);
    } catch {
      toast.error(failed, { description: 'Check your connection and try again.' });
    } finally {
      setBusy(null);
    }
  };

  const enter = (remix: Remix) => {
    if (!challenge) return;
    if (!user) return setAuthOpen(true);
    act(
      remix.id,
      async () => {
        // The entry rule on the server requires a public remix, so that has to land first.
        if (!remix.isPublic) {
          await updateRemix(remix.id, { isPublic: true });
          editRemix(remix.id, { isPublic: true });
        }
        await enterChallenge(challenge.key, remix.id);
      },
      'You’re in. Good luck!',
      'Couldn’t enter this remix',
    );
  };

  const toggleVote = (entry: ChallengeEntry) => {
    if (!user) return setAuthOpen(true);
    const voted = myVotes.includes(entry.id);
    act(entry.id, () => (voted ? unvote(entry.id) : vote(entry.id)), voted ? 'Vote removed' : 'Vote counted', 'Couldn’t save your vote');
  };

  const authorName = (entry: ChallengeEntry) => (entry.userId === user?.id ? 'You' : authors.get(entry.userId)?.displayName ?? 'A FlavorCraft cook');

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link to="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Community
        </Link>

        {catalogLoading ? (
          <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted" />
        ) : !challenge ? (
          <>
            <h1 className="mt-6 text-4xl font-bold sm:text-5xl">This week’s challenge</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              The challenge needs the full recipe catalog, which couldn’t be loaded just now. Reload the page to try again.
            </p>
          </>
        ) : (
          <>
            <p className="mt-6 text-sm text-muted-foreground">This week’s challenge, {timeLeft(challenge.endsAt, now).toLowerCase()}</p>
            <h1 className="mt-1 text-4xl font-bold leading-tight sm:text-5xl">{challenge.brief.title}</h1>
            <p className="mt-3 max-w-2xl text-lg">{challenge.brief.brief}</p>
            <p className="mt-1 max-w-2xl text-muted-foreground">{challenge.brief.hint}</p>

            <section className="mt-8 rounded-xl border bg-card p-5" aria-labelledby="start-title">
              <h2 id="start-title" className="text-lg font-semibold">Everyone starts from this recipe</h2>
              <div className="mt-4">
                <RecipeCard recipe={challenge.recipe} layout="row" />
              </div>
              <div className="mt-5 border-t pt-4">
                <h3 className="text-sm font-semibold">Your remix has to manage all of this</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {judge(challenge.brief, challenge.recipe, challenge.recipe.ingredients).checks.map((c) => (
                    <li key={c.label}>{c.label}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">
                  The flavor chart does the checking, measured against the original recipe. Votes decide between the
                  remixes that pass.
                </p>
              </div>
              <Button asChild className="mt-5"><Link to={`/recipes/${challenge.recipe.id}`}>Open the recipe and remix it</Link></Button>
            </section>

            <section className="mt-12" aria-labelledby="attempts-title">
              <h2 id="attempts-title" className="text-2xl font-bold">Your attempts</h2>
              {attempts.length === 0 ? (
                <p className="mt-1 text-muted-foreground">
                  Change the ingredients on the recipe page and save your version. It will show up here with its result.
                </p>
              ) : (
                <ul className="mt-2 divide-y border-y">
                  {attempts.map(({ remix, verdict }) => {
                    const entered = myEntry?.remix.id === remix.id;
                    return (
                      <li key={remix.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                        <div className="min-w-0">
                          <Link to={`/remixes/${remix.id}`} className="font-medium hover:underline hover:underline-offset-4">{remix.title}</Link>
                          <span className="ml-2 text-sm text-muted-foreground">{verdict.met ? 'Meets the brief' : 'Doesn’t meet the brief yet'}</span>
                          <Checks verdict={verdict} />
                        </div>
                        {!accountsEnabled ? null : entered && myEntry ? (
                          <Button variant="outline" size="sm" disabled={busy === myEntry.id} onClick={() => act(myEntry.id, () => withdrawEntry(myEntry.id), 'Entry withdrawn', 'Couldn’t withdraw your entry')}>
                            Entered. Withdraw
                          </Button>
                        ) : myEntry ? (
                          <span className="max-w-[14rem] text-sm text-muted-foreground">One entry per week. Withdraw your entry to enter this one.</span>
                        ) : (
                          <div className="text-right">
                            <Button size="sm" disabled={busy === remix.id} onClick={() => enter(remix)}>
                              {busy === remix.id ? 'Entering…' : 'Enter this remix'}
                            </Button>
                            {!remix.isPublic && <p className="mt-1 text-xs text-muted-foreground">Entering makes it public.</p>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {accountsEnabled && (
              <section className="mt-12" aria-labelledby="entries-title">
                <h2 id="entries-title" className="text-2xl font-bold">Entries</h2>
                <p className="mt-1 text-muted-foreground">Remixes that meet the brief come first, then the most votes.</p>
                {entriesLoading ? (
                  <div className="mt-4 h-24 animate-pulse rounded-lg bg-muted" />
                ) : entriesFailed ? (
                  <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-muted-foreground">Couldn’t load the entries. Reload the page to try again.</p>
                ) : ranked.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-muted-foreground">No entries yet this week.</p>
                ) : (
                  <ol className="mt-2 divide-y border-y">
                    {ranked.map(({ entry, verdict }) => {
                      const mine = entry.userId === user?.id;
                      const voted = myVotes.includes(entry.id);
                      const author = authors.get(entry.userId);
                      const vector = computeProfile(entry.remix.ingredients).vector;
                      return (
                        <li key={entry.id} className="grid grid-cols-[1fr_auto] items-start gap-4 py-4">
                          <div className="min-w-0">
                            <Link to={`/remixes/${entry.remix.id}`} className="font-medium hover:underline hover:underline-offset-4">{entry.remix.title}</Link>
                            <p className="text-sm text-muted-foreground">
                              {author && !mine ? <Link to={`/people/${author.handle}`} className="underline underline-offset-2">{author.displayName}</Link> : authorName(entry)}
                              {', '}
                              {changeWords(tasteChanges(challenge.recipe.flavor.vector, vector)).toLowerCase()}
                            </p>
                            <FlavorBand values={vector} className="mt-2 h-1 max-w-xs" />
                            {verdict.met ? (
                              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium"><Check className="h-4 w-4" aria-hidden /> Meets the brief</p>
                            ) : (
                              <Checks verdict={{ met: false, checks: verdict.checks.filter((c) => !c.ok) }} />
                            )}
                          </div>
                          <Button
                            variant={voted ? 'default' : 'outline'}
                            size="sm"
                            disabled={mine || busy === entry.id}
                            aria-pressed={voted}
                            aria-label={`${voted ? 'Remove your vote from' : 'Vote for'} ${entry.remix.title}. ${plural(entry.voteCount, 'vote')}.`}
                            title={mine ? 'You can’t vote for your own entry' : undefined}
                            onClick={() => toggleVote(entry)}
                          >
                            <ThumbsUp className={cn('mr-1.5 h-4 w-4', voted && 'fill-current')} aria-hidden />
                            <span className="tabular-nums">{entry.voteCount}</span>
                          </Button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            )}

            {last && lastRanked.length > 0 && (
              <section className="mt-12" aria-labelledby="last-title">
                <h2 id="last-title" className="text-2xl font-bold">Last week: {last.brief.title}</h2>
                <p className="mt-1 text-muted-foreground">Starting from {last.recipe.title}.</p>
                <ol className="mt-2 divide-y border-y">
                  {lastRanked.slice(0, 3).map(({ entry, verdict }, i) => (
                    <li key={entry.id} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-2 py-3">
                      <span className="font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0">
                        <Link to={`/remixes/${entry.remix.id}`} className="font-medium hover:underline hover:underline-offset-4">{entry.remix.title}</Link>
                        <span className="block text-sm text-muted-foreground">
                          {authorName(entry)}{verdict.met ? '' : ', didn’t meet the brief'}
                        </span>
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">{plural(entry.voteCount, 'vote')}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Challenge;
