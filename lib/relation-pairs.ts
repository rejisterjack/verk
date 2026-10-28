import type { RelationType } from "@/lib/generated/prisma/client";

const INVERSE: Partial<Record<RelationType, RelationType>> = {
  BLOCKS: "BLOCKED_BY",
  BLOCKED_BY: "BLOCKS",
  PARENT: "CHILD",
  CHILD: "PARENT",
};

export function inverseRelation(
  type: RelationType,
): RelationType | null {
  return INVERSE[type] ?? null;
}
