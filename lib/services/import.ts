import { prisma } from "@/lib/db";
import { parseLinearCsv } from "@/lib/import/linear-csv";
import * as issuesService from "@/lib/services/issues";

export async function importLinearCsv(
  teamId: string,
  userId: string,
  csvText: string,
) {
  const rows = parseLinearCsv(csvText);
  const members = await prisma.membership.findMany({
    where: { teamId },
    include: { user: { select: { id: true, email: true } } },
  });
  const byEmail = new Map(
    members.map((m) => [m.user.email.toLowerCase(), m.user.id]),
  );

  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      await issuesService.createIssue(teamId, userId, {
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        assigneeId: row.assigneeEmail
          ? (byEmail.get(row.assigneeEmail) ?? null)
          : null,
      });
      created++;
    } catch (e) {
      errors.push(`${row.title}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return { created, total: rows.length, errors };
}

/** Best-effort Linear GraphQL import using a personal API key. */
export async function importFromLinearApi(
  teamId: string,
  userId: string,
  apiKey: string,
  teamKey?: string,
) {
  const query = `
    query($first: Int!) {
      issues(first: $first) {
        nodes {
          title
          description
          priority
          state { name }
          assignee { email }
          team { key }
        }
      }
    }
  `;

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables: { first: 100 } }),
  });

  if (!res.ok) {
    throw new Error(`Linear API error: ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: {
      issues?: {
        nodes: Array<{
          title: string;
          description?: string | null;
          priority: number;
          state?: { name: string };
          assignee?: { email: string } | null;
          team?: { key: string };
        }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0]!.message);
  }

  const nodes = json.data?.issues?.nodes ?? [];
  const filtered = teamKey
    ? nodes.filter((n) => n.team?.key?.toLowerCase() === teamKey.toLowerCase())
    : nodes;

  const priorityMap: Record<number, string> = {
    0: "NONE",
    1: "URGENT",
    2: "HIGH",
    3: "MEDIUM",
    4: "LOW",
  };

  const csvLines = [
    "Title,Description,Status,Priority,Assignee",
    ...filtered.map((n) => {
      const title = JSON.stringify(n.title);
      const desc = JSON.stringify(n.description ?? "");
      const status = n.state?.name ?? "Backlog";
      const priority = priorityMap[n.priority] ?? "No priority";
      const email = n.assignee?.email ?? "";

      return `${title},${desc},${JSON.stringify(status)},${JSON.stringify(priority)},${JSON.stringify(email)}`;
    }),
  ];

  return importLinearCsv(teamId, userId, csvLines.join("\n"));
}
