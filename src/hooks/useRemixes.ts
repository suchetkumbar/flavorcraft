import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountsEnabled } from '@/lib/supabase';
import { fetchRemix, fetchRemixesOf } from '@/lib/kitchen/remote';
import { useKitchen } from '@/lib/kitchen/store';
import type { Remix } from '@/lib/kitchen/types';

/** A remix by id: your own from the local kitchen, otherwise a public one from the server. */
export const useRemix = (id: string | null | undefined) => {
  const local = useKitchen((s) => (id ? s.remixes.find((r) => r.id === id) : undefined));
  const query = useQuery({
    queryKey: ['remix', id],
    queryFn: () => fetchRemix(id!),
    enabled: Boolean(id) && !local && accountsEnabled,
    staleTime: 60_000,
  });
  return {
    remix: local ?? query.data ?? null,
    isLoading: !local && query.isLoading && query.fetchStatus !== 'idle',
    isMine: Boolean(local),
  };
};

const mergeById = (mine: Remix[], others: Remix[]) => {
  const ids = new Set(mine.map((r) => r.id));
  return [...mine, ...others.filter((r) => !ids.has(r.id))];
};

/** Your remixes of a recipe, plus public ones from everyone else. */
export const useRemixesOf = (recipeId: string) => {
  const all = useKitchen((s) => s.remixes);
  const mine = useMemo(() => all.filter((r) => r.parentRecipeId === recipeId), [all, recipeId]);
  const query = useQuery({
    queryKey: ['remixes-of', recipeId],
    queryFn: () => fetchRemixesOf(recipeId),
    enabled: accountsEnabled && Boolean(recipeId),
    staleTime: 60_000,
  });
  return useMemo(
    () => ({ mine, all: mergeById(mine, query.data ?? []), mineIds: new Set(mine.map((r) => r.id)) }),
    [mine, query.data],
  );
};
