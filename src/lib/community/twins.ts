import { TASTES, distance, type TasteVector } from '../flavor/tastes';
import type { KitchenData } from '../kitchen/types';

export interface PublicProfile {
  userId: string;
  handle: string;
  displayName: string;
  taste: TasteVector;
  /** Recipe ids this cook rated highly or saved, best first. */
  favorites: string[];
  updatedAt: string;
}

/**
 * 0–100: how alike two palates are. Taste profiles are averages of many
 * dishes, so they sit close together; the curve is steep on purpose, or
 * everyone would look like a 90% match.
 */
export const tasteMatch = (a: TasteVector, b: TasteVector): number => Math.round(100 * Math.exp(-((distance(a, b) / 4) ** 2)));

const NOUN = ['sweetness', 'salt', 'sourness', 'bitterness', 'savory depth', 'heat', 'richness', 'herbs and spice'];

const list = (words: string[]) => (words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

/** What two cooks have in common, measured against the typical recipe. */
export const sharedTastes = (a: TasteVector, b: TasteVector, average: TasteVector): string => {
  const lean = TASTES.map((_, i) => ({ i, a: a[i] - average[i], b: b[i] - average[i] }));
  const both = (sign: 1 | -1) =>
    lean
      .filter((x) => x.a * sign >= 0.6 && x.b * sign >= 0.6)
      .sort((x, y) => Math.min(y.a * sign, y.b * sign) - Math.min(x.a * sign, x.b * sign))
      .slice(0, 2)
      .map((x) => NOUN[x.i]);
  const more = both(1);
  if (more.length) return `You both like more ${list(more)} than most`;
  const less = both(-1);
  if (less.length) return `You both go easy on ${list(less)}`;
  return 'Your overall balance is close';
};

export interface Twin {
  profile: PublicProfile;
  match: number;
  shared: string;
}

/** Other cooks ranked by how close their palate is to yours. */
export const rankTwins = (me: TasteVector, profiles: PublicProfile[], average: TasteVector, myId?: string | null, limit = 12): Twin[] =>
  profiles
    .filter((p) => p.userId !== myId)
    .map((p) => ({ profile: p, match: tasteMatch(me, p.taste), shared: sharedTastes(me, p.taste, average) }))
    .sort((a, b) => b.match - a.match || a.profile.handle.localeCompare(b.profile.handle))
    .slice(0, limit);

export const MAX_FAVORITES = 12;

/** The dishes worth showing on a public profile: rated 4 or 5 (newest first), then saved. */
export const favoritesFrom = (kitchen: Pick<KitchenData, 'saved' | 'cooks'>): string[] => {
  const liked = [...kitchen.cooks]
    .filter((c) => (c.rating ?? 0) >= 4)
    .sort((a, b) => b.cookedAt.localeCompare(a.cookedAt))
    .map((c) => c.recipeId);
  const saved = [...kitchen.saved].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map((s) => s.recipeId);
  return [...new Set([...liked, ...saved])].slice(0, MAX_FAVORITES);
};

/** A starting handle from a name: "Asha K." becomes "asha_k". */
export const suggestHandle = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

/** Why a handle can't be used, or null when it's fine. Mirrors the database check. */
export const handleProblem = (handle: string): string | null => {
  if (handle.length < 3) return 'Use at least 3 characters.';
  if (handle.length > 24) return 'Use 24 characters or fewer.';
  if (!/^[a-z0-9_]+$/.test(handle)) return 'Use only lowercase letters, numbers and underscores.';
  return null;
};

/** True when a published profile no longer matches the cook's kitchen. */
export const profileIsStale = (published: PublicProfile, taste: TasteVector, favorites: string[]): boolean =>
  distance(published.taste, taste) >= 0.3 || published.favorites.join() !== favorites.join();
