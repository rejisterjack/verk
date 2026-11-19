import type { RelationType } from "@/lib/generated/prisma/client";

const INVERSE: Partial<Record<RelationType, RelationType>> = {
  BLOCKS: "BLOCKED_BY",
  BLOCKED_BY: "BLOCKS",
  PARENT: "CHILD",
  CHILD: "PARENT",
  DUPLICATE: "DUPLICATED_BY",
  DUPLICATED_BY: "DUPLICATE",
};

export function inverseRelation(type: RelationType): RelationType | null {
  return INVERSE[type] ?? null;
}

export type Edge = { from: string; to: string };

/**
 * Would adding `from -> to` close a loop? True when `to` can already reach `from`
 * through `edges` (or when `from === to`).
 */
export function wouldCreateCycle(
  edges: Edge[],
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const next = new Map<string, string[]>();

  for (const edge of edges) {
    const list = next.get(edge.from);

    if (list) list.push(edge.to);
    else next.set(edge.from, [edge.to]);
  }
  const seen = new Set<string>([to]);
  const queue = [to];

  while (queue.length) {
    const node = queue.shift()!;

    for (const child of next.get(node) ?? []) {
      if (child === from) return true;
      if (!seen.has(child)) {
        seen.add(child);
        queue.push(child);
      }
    }
  }

  return false;
}

/**
 * Normalise a relation to the "forward" direction used for loop checks:
 * BLOCKS and PARENT point from the blocker / parent to the other issue.
 * Returns null for relation types that cannot loop (RELATED, duplicates).
 */
export function forwardEdge(
  type: RelationType,
  from: string,
  to: string,
): { kind: "BLOCKS" | "PARENT"; edge: Edge } | null {
  switch (type) {
    case "BLOCKS":
      return { kind: "BLOCKS", edge: { from, to } };
    case "BLOCKED_BY":
      return { kind: "BLOCKS", edge: { from: to, to: from } };
    // CHILD is stored on the parent: parent --CHILD--> child.
    case "CHILD":
      return { kind: "PARENT", edge: { from, to } };
    case "PARENT":
      return { kind: "PARENT", edge: { from: to, to: from } };
    default:
      return null;
  }
}
