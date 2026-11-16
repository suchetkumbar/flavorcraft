import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import FlavorBand from '@/components/flavor/FlavorBand';
import { TASTES, type TasteVector } from '@/lib/flavor/tastes';
import { branchColor, buildFamily, changeWords, familySize, ROOT_ID } from '@/lib/community/tree';
import type { Remix } from '@/lib/kitchen/types';
import { cn } from '@/lib/utils';

interface RemixTreeProps {
  recipeId: string;
  recipeTitle: string;
  recipeVector: TasteVector;
  remixes: Remix[];
  /** Remix to highlight as "you are here". */
  currentId?: string;
  mineIds?: Set<string>;
}

const COLUMN = 232;
const NODE_W = 192;
const ROW = 92;
const NODE_H = 72;

/**
 * A recipe's remixes as a family tree: the original on the left, each fork to
 * the right of what it came from. Every branch is drawn in the color of the
 * taste that fork changed most, so you can see where the family went sour,
 * hot or rich without opening anything.
 */
const RemixTree = ({ recipeId, recipeTitle, recipeVector, remixes, currentId, mineIds }: RemixTreeProps) => {
  const nodes = useMemo(() => buildFamily(recipeTitle, recipeVector, remixes), [recipeTitle, recipeVector, remixes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const { columns, rows } = familySize(nodes);
  const width = (columns - 1) * COLUMN + NODE_W;
  const height = (rows - 1) * ROW + NODE_H;
  const used = [...new Set(nodes.map((n) => n.changes[0]?.taste).filter((t): t is number => t !== undefined))].sort((a, b) => a - b);

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="relative" style={{ width, height }}>
          <svg width={width} height={height} className="absolute inset-0" aria-hidden>
            {nodes.map((n) => {
              const parent = n.parentId ? byId.get(n.parentId) : undefined;
              if (!parent) return null;
              const x1 = parent.depth * COLUMN + NODE_W;
              const y1 = parent.row * ROW + NODE_H / 2;
              const x2 = n.depth * COLUMN;
              const y2 = n.row * ROW + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              return (
                <path
                  key={n.id}
                  d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={branchColor(n) ?? 'hsl(var(--border))'}
                  strokeWidth={branchColor(n) ? 2.5 : 1.5}
                  strokeDasharray={n.detached ? '5 4' : undefined}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          {nodes.map((n) => {
            const isRoot = n.id === ROOT_ID;
            const parent = n.parentId ? byId.get(n.parentId) : undefined;
            const words = isRoot ? 'Original recipe' : changeWords(n.changes);
            const here = n.id === currentId;
            return (
              <Link
                key={n.id}
                to={isRoot ? `/recipes/${recipeId}` : `/remixes/${n.id}`}
                aria-current={here ? 'page' : undefined}
                aria-label={
                  isRoot
                    ? `${n.title}, the original recipe`
                    : `${n.title}, forked from ${n.detached ? 'a remix you can’t see' : parent?.title}. ${words}.`
                }
                className={cn(
                  'absolute flex flex-col justify-between rounded-lg border bg-card px-3 py-2 transition-colors hover:border-foreground',
                  here && 'border-foreground ring-1 ring-foreground',
                  isRoot && 'bg-background',
                )}
                style={{ left: n.depth * COLUMN, top: n.row * ROW, width: NODE_W, height: NODE_H }}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{n.title}</span>
                  {!isRoot && mineIds?.has(n.id) && <span className="shrink-0 text-xs text-muted-foreground">Yours</span>}
                </span>
                <span className="truncate text-xs text-muted-foreground">{words}</span>
                <FlavorBand values={n.vector} className="h-1" />
              </Link>
            );
          })}
        </div>
      </div>
      {used.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Each branch is colored by the taste that fork changed most:</span>
          {used.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: TASTES[t].color }} aria-hidden />
              {TASTES[t].label}
            </span>
          ))}
          {nodes.some((n) => n.detached) && <span>Dashed: forked from a remix that is private or deleted.</span>}
        </p>
      )}
    </div>
  );
};

export default RemixTree;
