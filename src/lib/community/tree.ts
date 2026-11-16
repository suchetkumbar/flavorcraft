import { computeProfile } from '../flavor/profile';
import { TASTES, type TasteVector } from '../flavor/tastes';
import type { Remix } from '../kitchen/types';

export interface TasteChange {
  /** Index into TASTES. */
  taste: number;
  delta: number;
}

export interface FamilyNode {
  /** 'root' for the original recipe, otherwise the remix id. */
  id: string;
  title: string;
  remix: Remix | null;
  vector: TasteVector;
  parentId: string | null;
  /** Generations away from the original recipe. */
  depth: number;
  /** Vertical position, in rows. Parents sit in the middle of their forks. */
  row: number;
  /** How the taste moved from the parent, biggest change first. */
  changes: TasteChange[];
  /** The remix it was forked from can't be seen (private or deleted), so it hangs off the original. */
  detached: boolean;
}

export const ROOT_ID = 'root';
/** Changes smaller than this aren't worth pointing out. */
const NOTICEABLE = 0.5;

export const tasteChanges = (from: TasteVector, to: TasteVector): TasteChange[] =>
  to
    .map((v, taste) => ({ taste, delta: Math.round((v - from[taste]) * 10) / 10 }))
    .filter((c) => Math.abs(c.delta) >= NOTICEABLE)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

const MORE = ['Sweeter', 'Saltier', 'More sour', 'More bitter', 'More savory', 'Hotter', 'Richer', 'More aromatic'];
const LESS = ['Less sweet', 'Less salty', 'Less sour', 'Less bitter', 'Less savory', 'Milder', 'Lighter', 'Less aromatic'];

/** "More sour, lighter" */
export const changeWords = (changes: TasteChange[], max = 2): string =>
  changes.length === 0
    ? 'Tastes about the same'
    : changes
        .slice(0, max)
        .map((c, i) => {
          const word = (c.delta > 0 ? MORE : LESS)[c.taste];
          return i === 0 ? word : word.toLowerCase();
        })
        .join(', ');

/** Color of the taste that moved most, for drawing the branch to this node. */
export const branchColor = (node: FamilyNode): string | null => (node.changes[0] ? TASTES[node.changes[0].taste].color : null);

/**
 * Lays out a recipe and every visible remix of it as a family tree: the
 * original on the left, each fork one column to the right of what it was
 * forked from. Leaves take one row each, and a parent is centered on its forks.
 */
export const buildFamily = (rootTitle: string, rootVector: TasteVector, remixes: Remix[]): FamilyNode[] => {
  const ids = new Set(remixes.map((r) => r.id));
  const parentOf = (r: Remix) => (r.parentRemixId && r.parentRemixId !== r.id && ids.has(r.parentRemixId) ? r.parentRemixId : ROOT_ID);
  const childrenOf = new Map<string, Remix[]>();
  for (const r of [...remixes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const p = parentOf(r);
    childrenOf.set(p, [...(childrenOf.get(p) ?? []), r]);
  }

  const nodes: FamilyNode[] = [];
  const seen = new Set<string>();
  let nextRow = 0;

  const place = (id: string, title: string, remix: Remix | null, vector: TasteVector, parent: FamilyNode | null): FamilyNode => {
    seen.add(id);
    const node: FamilyNode = {
      id,
      title,
      remix,
      vector,
      parentId: parent?.id ?? null,
      depth: parent ? parent.depth + 1 : 0,
      row: 0,
      changes: parent ? tasteChanges(parent.vector, vector) : [],
      detached: Boolean(remix?.parentRemixId && parent?.id === ROOT_ID),
    };
    nodes.push(node);
    const kids = (childrenOf.get(id) ?? []).filter((k) => !seen.has(k.id));
    if (kids.length === 0) {
      node.row = nextRow;
      nextRow += 1;
    } else {
      const placed = kids.map((k) => place(k.id, k.title, k, computeProfile(k.ingredients).vector, node));
      node.row = (placed[0].row + placed[placed.length - 1].row) / 2;
    }
    return node;
  };

  const root = place(ROOT_ID, rootTitle, null, rootVector, null);
  // Remixes caught in a loop of parents (bad data) are never reached from the original.
  for (const r of remixes) {
    if (seen.has(r.id)) continue;
    place(r.id, r.title, r, computeProfile(r.ingredients).vector, root).detached = true;
  }
  return nodes;
};

export const familySize = (nodes: FamilyNode[]) => ({
  columns: Math.max(...nodes.map((n) => n.depth)) + 1,
  rows: Math.max(...nodes.map((n) => n.row)) + 1,
});
