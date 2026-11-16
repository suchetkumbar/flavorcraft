import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useRecipes';
import { accountsEnabled } from '@/lib/supabase';
import * as remote from '@/lib/community/remote';
import { favoritesFrom, profileIsStale } from '@/lib/community/twins';
import { useTasteSettings } from '@/lib/kitchen/settings';
import { useKitchen } from '@/lib/kitchen/store';
import { buildTasteProfile, catalogAverage } from '@/lib/kitchen/tasteProfile';

const FIVE_MINUTES = 5 * 60_000;

/** Your taste profile and favorite dishes, from the kitchen on this device. */
export const useMyTaste = () => {
  const { data } = useCatalog();
  const saved = useKitchen((s) => s.saved);
  const remixes = useKitchen((s) => s.remixes);
  const cooks = useKitchen((s) => s.cooks);
  const quiz = useTasteSettings((s) => s.quiz);
  return useMemo(() => {
    const recipes = data?.recipes ?? [];
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const profile = buildTasteProfile({ saved, remixes, cooks }, byId, quiz?.vector);
    return {
      taste: profile?.vector ?? null,
      favorites: favoritesFrom({ saved, cooks }).filter((id) => byId.has(id)),
      average: recipes.length ? catalogAverage(recipes) : null,
      tried: new Set([...saved.map((s) => s.recipeId), ...cooks.map((c) => c.recipeId)]),
    };
  }, [data, saved, remixes, cooks, quiz]);
};

/** The signed-in user's public profile, or null when they haven't shared one. */
export const useMyProfile = () => {
  const userId = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: ['my-profile', userId],
    queryFn: () => remote.fetchMyProfile(userId!),
    enabled: Boolean(userId),
    staleTime: FIVE_MINUTES,
  });
};

export const useProfiles = () =>
  useQuery({ queryKey: ['profiles'], queryFn: () => remote.fetchProfiles(), enabled: accountsEnabled, staleTime: FIVE_MINUTES });

export const useProfile = (handle: string | undefined) =>
  useQuery({
    queryKey: ['profile', handle],
    queryFn: () => remote.fetchProfileByHandle(handle!),
    enabled: accountsEnabled && Boolean(handle),
    staleTime: FIVE_MINUTES,
  });

/** Public profiles for a set of user ids, as a lookup. Cooks without a profile are simply absent. */
export const useAuthors = (userIds: (string | undefined)[]) => {
  const ids = useMemo(() => [...new Set(userIds.filter((id): id is string => Boolean(id)))].sort(), [userIds]);
  const query = useQuery({
    queryKey: ['authors', ids],
    queryFn: () => remote.fetchProfilesByIds(ids),
    enabled: accountsEnabled && ids.length > 0,
    staleTime: FIVE_MINUTES,
  });
  return useMemo(() => new Map((query.data ?? []).map((p) => [p.userId, p])), [query.data]);
};

/** Ids of the cooks you follow. Empty when signed out. */
export const useFollowing = () => {
  const userId = useAuth((s) => s.user?.id);
  return useQuery({ queryKey: ['following', userId], queryFn: remote.fetchFollowing, enabled: Boolean(userId), staleTime: FIVE_MINUTES });
};

export const usePublicRemixesBy = (userIds: string[], limit = 20) => {
  const ids = useMemo(() => [...userIds].sort(), [userIds]);
  return useQuery({
    queryKey: ['public-remixes-by', ids, limit],
    queryFn: () => remote.fetchPublicRemixesBy(ids, limit),
    enabled: accountsEnabled && ids.length > 0,
    staleTime: 60_000,
  });
};

export const useEntries = (challengeKey: string | undefined) =>
  useQuery({
    queryKey: ['challenge-entries', challengeKey],
    queryFn: () => remote.fetchEntries(challengeKey!),
    enabled: accountsEnabled && Boolean(challengeKey),
    staleTime: 30_000,
  });

export const useMyVotes = (entryIds: string[]) => {
  const userId = useAuth((s) => s.user?.id);
  const ids = useMemo(() => [...entryIds].sort(), [entryIds]);
  return useQuery({
    queryKey: ['challenge-votes', userId, ids],
    queryFn: () => remote.fetchMyVotes(ids),
    enabled: Boolean(userId) && ids.length > 0,
    staleTime: 30_000,
  });
};

/**
 * Keeps a shared profile in step with the kitchen: when your taste or your
 * favorite dishes change, the public copy is updated. Does nothing unless you
 * have chosen to share a profile.
 */
export const useKeepProfileFresh = () => {
  const user = useAuth((s) => s.user);
  const syncing = useAuth((s) => s.syncing);
  const ownerId = useKitchen((s) => s.ownerId);
  const { data: mine } = useMyProfile();
  const { taste, favorites } = useMyTaste();
  const client = useQueryClient();
  const sent = useRef('');

  useEffect(() => {
    // Wait until this device holds the account's kitchen, or a half-loaded one would be published.
    if (!user || syncing || ownerId !== user.id || !mine || !taste) return;
    if (!profileIsStale(mine, taste, favorites)) return;
    const signature = JSON.stringify([taste, favorites]);
    if (sent.current === signature) return;
    sent.current = signature;
    remote
      .saveProfile({ handle: mine.handle, displayName: mine.displayName, taste, favorites })
      .then(() => client.invalidateQueries({ queryKey: ['my-profile'] }))
      .catch(() => {
        // Not worth interrupting the cook; the next change tries again.
        sent.current = '';
      });
  }, [user, syncing, ownerId, mine, taste, favorites, client]);
};
