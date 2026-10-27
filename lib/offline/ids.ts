export function newClientMutationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newTmpIssueId(): string {
  return `tmp_${newClientMutationId().replace(/-/g, "")}`;
}

export function isTmpIssueId(id: string): boolean {
  return id.startsWith("tmp_");
}
