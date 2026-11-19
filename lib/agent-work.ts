/**
 * What an automated agent should pick up next. Pure ranking so the order is explainable and
 * testable: urgent first, then things already started, then older before newer. Issues that are
 * blocked, unassigned-to-anyone-else-but-not-this-agent, or finished are never offered.
 */

export type WorkCandidate = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  createdAt: Date;
  blocked: boolean;
};

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

const STATUS_RANK: Record<string, number> = {
  IN_PROGRESS: 0,
  TODO: 1,
  BACKLOG: 2,
};

/**
 * Candidates this agent may take: assigned to it, or to nobody; open; and not blocked by another
 * unfinished issue. Sorted best-first.
 */
export function rankWork(
  candidates: WorkCandidate[],
  agentUserId: string,
): WorkCandidate[] {
  return candidates
    .filter(
      (issue) =>
        !issue.blocked &&
        (issue.assigneeId === null || issue.assigneeId === agentUserId) &&
        issue.status in STATUS_RANK,
    )
    .sort((a, b) => {
      // Work already assigned to this agent comes before anything unassigned.
      const mine =
        Number(b.assigneeId === agentUserId) -
        Number(a.assigneeId === agentUserId);

      if (mine) return mine;
      const priority =
        (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);

      if (priority) return priority;
      const status =
        (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3);

      if (status) return status;

      return a.createdAt.getTime() - b.createdAt.getTime();
    });
}

/** The self-description agents read to discover what this server offers and how to talk to it. */
export function agentManifest(origin: string) {
  const base = origin.replace(/\/$/, "");

  return {
    name: "Verk",
    description: "Issue tracker with a REST API, GraphQL, MCP and webhooks.",
    auth: {
      type: "bearer",
      note: "Create an API key in Settings → API keys (or use OAuth). Keys are team-scoped and role-limited.",
      oauth: {
        authorize: `${base}/oauth/authorize`,
        token: `${base}/api/oauth/token`,
        pkce: "S256",
        scopes: ["read", "write"],
      },
    },
    endpoints: {
      rest: `${base}/api/teams/{teamId}`,
      graphql: `${base}/api/teams/{teamId}/graphql`,
      mcp: `${base}/api/mcp`,
      agentPrompt: `${base}/api/agent`,
      nextWork: `${base}/api/teams/{teamId}/agent/next`,
      claims: `${base}/api/teams/{teamId}/agent/claims`,
      webhooks: `${base}/api/teams/{teamId}/hooks`,
      search: `${base}/api/teams/{teamId}/search?q=`,
    },
    workflow: [
      "GET nextWork to find an open issue you may take",
      'POST claims {"action":"claim","issueId":...} to take a lease (30 minutes by default)',
      'POST claims {"action":"heartbeat","issueId":...,"note":...} while you work',
      'POST claims {"action":"complete"|"fail"|"release","issueId":...,"note":...,"resultUrl":...} to finish',
    ],
    limits: {
      note: "Mutations go through the same validation as the web app. Rate limits apply per IP and per user.",
    },
  };
}
