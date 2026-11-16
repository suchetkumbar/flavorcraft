import { supabase } from '../supabase';
import type { DishProblem } from '../flavor/fixes';
import { clampVector } from '../flavor/tastes';
import { toRemix } from '../kitchen/remote';
import type { Remix } from '../kitchen/types';
import type { CrowdSignal } from './crowd';
import type { PublicProfile } from './twins';

/** Supabase queries for the community features. Row-level security decides what each caller sees. */

const db = () => {
  if (!supabase) throw new Error('Accounts are not configured');
  return supabase;
};

const check = <T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): T => {
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
};

interface ProfileRow {
  user_id: string;
  handle: string;
  display_name: string;
  taste: number[];
  favorites: string[];
  updated_at: string;
}

const toProfile = (p: ProfileRow): PublicProfile => ({
  userId: p.user_id,
  handle: p.handle,
  displayName: p.display_name,
  taste: clampVector(p.taste),
  favorites: p.favorites,
  updatedAt: p.updated_at,
});

// Profiles -------------------------------------------------------------------------

/** Most recently active public profiles. Ranking by taste happens in the browser. */
export const fetchProfiles = async (limit = 500): Promise<PublicProfile[]> =>
  (check(await db().from('profiles').select('*').order('updated_at', { ascending: false }).limit(limit)) as ProfileRow[]).map(toProfile);

export const fetchProfileByHandle = async (handle: string): Promise<PublicProfile | null> => {
  const rows = check(await db().from('profiles').select('*').eq('handle', handle).limit(1)) as ProfileRow[];
  return rows[0] ? toProfile(rows[0]) : null;
};

export const fetchProfilesByIds = async (userIds: string[]): Promise<PublicProfile[]> =>
  userIds.length ? (check(await db().from('profiles').select('*').in('user_id', userIds)) as ProfileRow[]).map(toProfile) : [];

export const fetchMyProfile = async (userId: string): Promise<PublicProfile | null> => (await fetchProfilesByIds([userId]))[0] ?? null;

/** Thrown message when the handle is taken (unique violation). */
export const HANDLE_TAKEN = 'handle-taken';

export const saveProfile = async (profile: Pick<PublicProfile, 'handle' | 'displayName' | 'taste' | 'favorites'>) => {
  const { error } = await db()
    .from('profiles')
    .upsert({
      handle: profile.handle,
      display_name: profile.displayName.trim(),
      taste: profile.taste,
      favorites: profile.favorites,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.code === '23505' ? HANDLE_TAKEN : error.message);
};

export const deleteProfile = async (userId: string) => check(await db().from('profiles').delete().eq('user_id', userId));

// Follows ---------------------------------------------------------------------------

/** Ids of the cooks the signed-in user follows. */
export const fetchFollowing = async (): Promise<string[]> =>
  (check(await db().from('follows').select('followee_id')) as { followee_id: string }[]).map((f) => f.followee_id);

export const follow = async (userId: string) => check(await db().from('follows').upsert({ followee_id: userId }));
export const unfollow = async (userId: string) => check(await db().from('follows').delete().eq('followee_id', userId));

/** Newest public remixes by the given cooks. */
export const fetchPublicRemixesBy = async (userIds: string[], limit = 20): Promise<Remix[]> =>
  userIds.length
    ? (
        check(
          await db().from('remixes').select('*').in('user_id', userIds).eq('is_public', true).order('created_at', { ascending: false }).limit(limit),
        ) as Parameters<typeof toRemix>[0][]
      ).map(toRemix)
    : [];

// Challenges ------------------------------------------------------------------------

export interface ChallengeEntry {
  id: string;
  challengeKey: string;
  userId: string;
  voteCount: number;
  createdAt: string;
  remix: Remix;
}

interface EntryRow {
  id: string;
  challenge_key: string;
  user_id: string;
  vote_count: number;
  created_at: string;
  remix: Parameters<typeof toRemix>[0] | null;
}

export const fetchEntries = async (challengeKey: string): Promise<ChallengeEntry[]> =>
  (check(await db().from('challenge_entries').select('*, remix:remixes(*)').eq('challenge_key', challengeKey).limit(200)) as EntryRow[])
    // A remix made private after entering is hidden by row-level security.
    .filter((e) => e.remix)
    .map((e) => ({
      id: e.id,
      challengeKey: e.challenge_key,
      userId: e.user_id,
      voteCount: e.vote_count,
      createdAt: e.created_at,
      remix: toRemix(e.remix!),
    }));

export const enterChallenge = async (challengeKey: string, remixId: string) =>
  check(await db().from('challenge_entries').insert({ challenge_key: challengeKey, remix_id: remixId }));

export const withdrawEntry = async (entryId: string) => check(await db().from('challenge_entries').delete().eq('id', entryId));

/** Ids of the entries the signed-in user has voted for. */
export const fetchMyVotes = async (entryIds: string[]): Promise<string[]> =>
  entryIds.length
    ? (check(await db().from('challenge_votes').select('entry_id').in('entry_id', entryIds)) as { entry_id: string }[]).map((v) => v.entry_id)
    : [];

export const vote = async (entryId: string) => check(await db().from('challenge_votes').insert({ entry_id: entryId }));
export const unvote = async (entryId: string) => check(await db().from('challenge_votes').delete().eq('entry_id', entryId));

// Crowd signals -----------------------------------------------------------------------

export const fetchCrowdSignals = async (): Promise<CrowdSignal[]> =>
  (
    check(await db().rpc('crowd_signals')) as { recipe_id: string; cooks: number; problem: DishProblem | null; reports: number }[]
  ).map((r) => ({ recipeId: r.recipe_id, cooks: r.cooks, problem: r.problem, reports: r.reports }));
