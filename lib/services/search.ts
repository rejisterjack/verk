import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { readableIssueScope } from "@/lib/services/guest-scope";
import {
  isEmptyQuery,
  parseQuery,
  recencyBonus,
  type Scored,
  scoreMatch,
  type SearchKind,
  snippet,
} from "@/lib/search";

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  /** Extra fields the palette shows for an issue. */
  number?: number;
  status?: string;
  priority?: string;
};

export type SearchResult = {
  query: string;
  hits: Scored<SearchHit>[];
  /** Operators that were understood, so the UI can echo them back. */
  applied: string[];
};

const PER_KIND = 8;

function like(term: string): Prisma.StringFilter {
  return { contains: term, mode: "insensitive" };
}

/** Every term must appear in at least one of the fields. */
function allTermsIn(
  terms: string[],
  fields: string[],
): Record<string, unknown>[] {
  return terms.map((term) => ({
    OR: fields.map((field) => ({ [field]: like(term) })),
  }));
}

/** Names, emails, ids -> a user id. `me` means the caller. */
async function resolveUser(
  teamId: string,
  value: string,
  callerId?: string | null,
): Promise<string | null | undefined> {
  if (value.toLowerCase() === "me") return callerId ?? undefined;
  if (["none", "unassigned", "nobody"].includes(value.toLowerCase()))
    return null;
  const member = await prisma.membership.findFirst({
    where: {
      teamId,
      user: {
        OR: [
          { email: { equals: value, mode: "insensitive" } },
          { name: { contains: value, mode: "insensitive" } },
          { email: { startsWith: value, mode: "insensitive" } },
        ],
      },
    },
    select: { userId: true },
  });

  return member?.userId;
}

const STATUS_ALIASES: Record<string, string> = {
  backlog: "BACKLOG",
  todo: "TODO",
  open: "TODO",
  started: "IN_PROGRESS",
  "in-progress": "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  progress: "IN_PROGRESS",
  done: "DONE",
  completed: "DONE",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
};
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"];

/**
 * Search the team's issues, projects, initiatives, docs, customers, cycles and people.
 * Operators (assignee:me, status:todo, ...) narrow issues; plain words match across everything.
 */
export async function searchTeam(
  teamId: string,
  teamSlug: string,
  rawQuery: string,
  opts: { userId?: string | null; limit?: number } = {},
): Promise<SearchResult> {
  const key = teamSlug.slice(0, 3).toUpperCase();
  const parsed = parseQuery(rawQuery, key);
  const applied: string[] = [];

  if (isEmptyQuery(parsed)) return { query: rawQuery, hits: [], applied };

  const base = `/t/${teamSlug}`;
  const want = (kind: SearchKind) =>
    parsed.kinds.length === 0 || parsed.kinds.includes(kind);
  const hasIssueOnlyOperator = parsed.operators.length > 0;
  const now = new Date();

  // ---- issues ---------------------------------------------------------------------------
  const issueWhere: Prisma.IssueWhereInput = { teamId, archivedAt: null };
  const and: Prisma.IssueWhereInput[] = [];
  const guestScope = await readableIssueScope(teamId, opts.userId);

  if (guestScope) and.push(guestScope);

  for (const op of parsed.operators) {
    const negate = (clause: Prisma.IssueWhereInput) =>
      op.negate ? { NOT: clause } : clause;

    switch (op.key) {
      case "assignee":
      case "creator": {
        const user = await resolveUser(teamId, op.value, opts.userId);

        if (user === undefined) {
          and.push({ id: "__no_match__" }); // unknown person: nothing matches
        } else {
          const field = op.key === "assignee" ? "assigneeId" : "creatorId";

          and.push(negate({ [field]: user } as Prisma.IssueWhereInput));
        }
        applied.push(`${op.negate ? "-" : ""}${op.key}:${op.value}`);
        break;
      }
      case "status": {
        const status = STATUS_ALIASES[op.value.toLowerCase()];

        if (status) {
          and.push(negate({ status: status as never }));
          applied.push(`${op.negate ? "-" : ""}status:${op.value}`);
        }
        break;
      }
      case "priority": {
        const priority = op.value.toUpperCase();

        if (PRIORITIES.includes(priority)) {
          and.push(negate({ priority: priority as never }));
          applied.push(`${op.negate ? "-" : ""}priority:${op.value}`);
        }
        break;
      }
      case "label":
        and.push(
          negate({ labels: { some: { label: { name: like(op.value) } } } }),
        );
        applied.push(`${op.negate ? "-" : ""}label:${op.value}`);
        break;
      case "project":
        and.push(negate({ project: { name: like(op.value) } }));
        applied.push(`${op.negate ? "-" : ""}project:${op.value}`);
        break;
      case "cycle":
        and.push(
          negate(
            op.value.toLowerCase() === "current" ||
              op.value.toLowerCase() === "active"
              ? { cycle: { isActive: true } }
              : { cycle: { name: like(op.value) } },
          ),
        );
        applied.push(`${op.negate ? "-" : ""}cycle:${op.value}`);
        break;
    }
  }
  if (parsed.issueNumber !== null) {
    and.push({ number: parsed.issueNumber });
  }
  // Each word must appear in the title, the description or a comment (so people can search
  // what was said, not only what was written at the top).
  for (const term of parsed.terms) {
    and.push({
      OR: [
        { title: like(term) },
        { description: like(term) },
        { comments: { some: { body: like(term) } } },
      ],
    });
  }
  for (const word of parsed.excluded) {
    and.push({
      NOT: { OR: [{ title: like(word) }, { description: like(word) }] },
    });
  }
  if (and.length) issueWhere.AND = and;

  const issueRows = want("issue")
    ? await prisma.issue.findMany({
        where: issueWhere,
        select: {
          id: true,
          number: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          updatedAt: true,
          assignee: { select: { name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: PER_KIND * 3,
      })
    : [];

  const hits: Scored<SearchHit>[] = [];

  for (const row of issueRows) {
    const score = scoreMatch(
      { title: row.title, body: row.description, key: `${key}-${row.number}` },
      parsed.terms,
      recencyBonus(row.updatedAt, now),
    );

    if (parsed.terms.length && score === 0) {
      // Matched only through a comment: keep it, ranked low.
      hits.push({
        kind: "issue",
        id: row.id,
        title: row.title,
        subtitle: `${key}-${row.number}`,
        snippet: "Matched in a comment",
        href: `${base}/issues/${row.number}`,
        number: row.number,
        status: row.status,
        priority: row.priority,
        score: 1,
      });
      continue;
    }
    hits.push({
      kind: "issue",
      id: row.id,
      title: row.title,
      subtitle: `${key}-${row.number}${row.assignee ? ` · ${row.assignee.name ?? row.assignee.email}` : ""}`,
      snippet: snippet(row.description, parsed.terms),
      href: `${base}/issues/${row.number}`,
      number: row.number,
      status: row.status,
      priority: row.priority,
      score: parsed.issueNumber !== null ? 1000 : score,
    });
  }

  // ---- the other kinds only run for word searches (operators are issue filters) ----------
  if (!hasIssueOnlyOperator && parsed.terms.length) {
    const terms = parsed.terms;
    const [projects, initiatives, docs, customers, cycles, people] =
      await Promise.all([
        want("project")
          ? prisma.project.findMany({
              where: {
                teamId,
                ...(guestScope
                  ? { id: guestScope.projectId as { in: string[] } }
                  : {}),
                AND: allTermsIn(terms, ["name", "summary"]) as never,
              },
              select: {
                id: true,
                name: true,
                summary: true,
                status: true,
                updatedAt: true,
              },
              take: PER_KIND,
            })
          : [],
        want("initiative")
          ? prisma.initiative.findMany({
              where: { teamId, AND: allTermsIn(terms, ["name"]) as never },
              select: { id: true, name: true, createdAt: true },
              take: PER_KIND,
            })
          : [],
        want("doc")
          ? prisma.document.findMany({
              where: {
                teamId,
                AND: allTermsIn(terms, ["title", "body"]) as never,
              },
              select: { id: true, title: true, body: true, updatedAt: true },
              take: PER_KIND,
            })
          : [],
        want("customer")
          ? prisma.customer.findMany({
              where: {
                teamId,
                AND: allTermsIn(terms, ["name", "domain"]) as never,
              },
              select: { id: true, name: true, domain: true, createdAt: true },
              take: PER_KIND,
            })
          : [],
        want("cycle")
          ? prisma.cycle.findMany({
              where: { teamId, AND: allTermsIn(terms, ["name"]) as never },
              select: { id: true, name: true, startDate: true, endDate: true },
              take: PER_KIND,
            })
          : [],
        want("person")
          ? prisma.membership.findMany({
              where: {
                teamId,
                AND: terms.map((term) => ({
                  user: { OR: [{ name: like(term) }, { email: like(term) }] },
                })),
              },
              select: {
                user: { select: { id: true, name: true, email: true } },
              },
              take: PER_KIND,
            })
          : [],
      ]);

    for (const p of projects) {
      hits.push({
        kind: "project",
        id: p.id,
        title: p.name,
        subtitle: `Project · ${p.status.replaceAll("_", " ").toLowerCase()}`,
        snippet: snippet(p.summary, terms),
        href: `${base}/projects/${p.id}`,
        score: scoreMatch(
          { title: p.name, body: p.summary },
          terms,
          recencyBonus(p.updatedAt, now),
        ),
      });
    }
    for (const i of initiatives) {
      hits.push({
        kind: "initiative",
        id: i.id,
        title: i.name,
        subtitle: "Initiative",
        href: `${base}/initiatives`,
        score: scoreMatch(
          { title: i.name },
          terms,
          recencyBonus(i.createdAt, now),
        ),
      });
    }
    for (const d of docs) {
      hits.push({
        kind: "doc",
        id: d.id,
        title: d.title,
        subtitle: "Doc",
        snippet: snippet(d.body, terms),
        href: `${base}/docs#${d.id}`,
        score: scoreMatch(
          { title: d.title, body: d.body },
          terms,
          recencyBonus(d.updatedAt, now),
        ),
      });
    }
    for (const c of customers) {
      hits.push({
        kind: "customer",
        id: c.id,
        title: c.name,
        subtitle: c.domain ? `Customer · ${c.domain}` : "Customer",
        href: `${base}/customers`,
        score: scoreMatch(
          { title: c.name, body: c.domain },
          terms,
          recencyBonus(c.createdAt, now),
        ),
      });
    }
    for (const c of cycles) {
      hits.push({
        kind: "cycle",
        id: c.id,
        title: c.name,
        subtitle: `Cycle · ${c.startDate.toISOString().slice(0, 10)} → ${c.endDate.toISOString().slice(0, 10)}`,
        href: `${base}/cycles/${c.id}`,
        score: scoreMatch(
          { title: c.name },
          terms,
          recencyBonus(c.endDate, now),
        ),
      });
    }
    for (const m of people) {
      const name = m.user.name ?? m.user.email;

      hits.push({
        kind: "person",
        id: m.user.id,
        title: name,
        subtitle: m.user.email,
        href: `${base}/issues?filter=${encodeURIComponent(
          JSON.stringify({
            op: "and",
            rules: [{ field: "assignee", op: "is", value: m.user.id }],
          }),
        )}`,
        score: scoreMatch({ title: name, body: m.user.email }, terms),
      });
    }
  }

  const cap = opts.limit ?? 30;
  const ranked = hits
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap);

  return { query: rawQuery, hits: ranked, applied };
}
