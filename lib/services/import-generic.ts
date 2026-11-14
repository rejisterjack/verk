import type { Role } from "@/lib/generated/prisma/client";

import { type AuditEvent, recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import {
  applyMapping,
  type FieldId,
  guessMapping,
  type Mapping,
  MAX_IMPORT_BYTES,
  parseCsv,
} from "@/lib/import/generic-csv";
import { assertRole } from "@/lib/roles";
import * as issuesService from "@/lib/services/issues";
import * as labelsService from "@/lib/services/labels";
import * as projectsService from "@/lib/services/projects";

export function readCsv(text: string) {
  if (text.length > MAX_IMPORT_BYTES) {
    throw new AuthError("That file is larger than 5 MB", "BAD_REQUEST", 400);
  }
  const rows = parseCsv(text);

  if (rows.length < 2) {
    throw new AuthError(
      "The file needs a header row and at least one row",
      "BAD_REQUEST",
      400,
    );
  }

  return { headers: rows[0]!, rows, mapping: guessMapping(rows[0]!) };
}

/** Parse the `map_<field>` form fields (column index, or empty for "not mapped"). */
export function mappingFromForm(
  formData: FormData,
  fields: readonly FieldId[],
): Mapping {
  const mapping: Mapping = {};

  for (const field of fields) {
    const raw = String(formData.get(`map_${field}`) ?? "");

    if (/^\d+$/.test(raw)) mapping[field] = Number(raw);
  }

  return mapping;
}

/** Preview: what would be created, without writing anything. */
export function previewImport(text: string, mapping: Mapping) {
  const { rows } = readCsv(text);
  const result = applyMapping(rows, mapping);

  return { ...result, sample: result.rows.slice(0, 5) };
}

export async function runImport(
  teamId: string,
  userId: string,
  text: string,
  mapping: Mapping,
  role: Role,
  actor?: AuditEvent["actor"],
) {
  assertRole(role, "MEMBER");
  if (mapping.title === undefined) {
    throw new AuthError(
      "Choose which column holds the title",
      "BAD_REQUEST",
      400,
    );
  }
  const { rows } = readCsv(text);
  const { rows: parsed, problems, truncated } = applyMapping(rows, mapping);
  const members = await prisma.membership.findMany({
    where: { teamId },
    include: { user: { select: { id: true, email: true } } },
  });
  const byEmail = new Map(
    members.map((m) => [m.user.email.toLowerCase(), m.user.id]),
  );
  const labelIds = new Map<string, string>();
  const projectIds = new Map<string, string>();
  const errors: string[] = problems.map((p) => `Line ${p.line}: ${p.message}`);
  let created = 0;

  async function labelId(name: string) {
    const key = name.toLowerCase();
    const known = labelIds.get(key);

    if (known) return known;
    const existing = await prisma.label.findFirst({
      where: { teamId, name: { equals: name, mode: "insensitive" } },
    });
    const label =
      existing ?? (await labelsService.createLabel(teamId, { name }));

    labelIds.set(key, label.id);

    return label.id;
  }

  async function projectId(name: string) {
    const key = name.toLowerCase();
    const known = projectIds.get(key);

    if (known) return known;
    const existing = await prisma.project.findFirst({
      where: { teamId, name: { equals: name, mode: "insensitive" } },
    });
    const project =
      existing ?? (await projectsService.createProject(teamId, { name }));

    projectIds.set(key, project.id);

    return project.id;
  }

  for (const row of parsed) {
    try {
      await issuesService.createIssue(teamId, userId, {
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        dueDate: row.dueDate ? new Date(row.dueDate) : null,
        assigneeId: row.assigneeEmail
          ? (byEmail.get(row.assigneeEmail) ?? null)
          : null,
        labelIds: await Promise.all(row.labels.map(labelId)),
        projectId: row.project ? await projectId(row.project) : null,
      });
      created += 1;
    } catch (error) {
      errors.push(
        `Line ${row.line} (${row.title.slice(0, 40)}): ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }
  await recordAudit({
    teamId,
    actor: actor ?? { id: userId },
    action: "import.completed",
    targetType: "issues",
    summary: `Imported ${created} of ${parsed.length} issues from a CSV file`,
    metadata: {
      created,
      total: parsed.length,
      failed: parsed.length - created,
    },
  });

  return {
    created,
    total: parsed.length,
    truncated,
    errors: errors.slice(0, 30),
  };
}
