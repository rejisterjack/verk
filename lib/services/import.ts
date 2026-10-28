import { prisma } from "@/lib/db";
import { parseLinearCsv } from "@/lib/import/linear-csv";
import { fetchLinearIssuePages } from "@/lib/import/linear-pages";
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
  const { nodes, capped } = await fetchLinearIssuePages(apiKey);
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

  const result = await importLinearCsv(teamId, userId, csvLines.join("\n"));

  return { ...result, capped };
}
