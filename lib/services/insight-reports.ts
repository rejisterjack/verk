import { z } from "zod";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import { isDimension, isMeasure } from "@/lib/insights";
import { parseFilter } from "@/lib/issue-filter";

export const MAX_REPORTS_PER_TEAM = 100;

const reportSchema = z.object({
  name: z.string().trim().min(1).max(80),
  measure: z.string().refine(isMeasure, "Unknown measure"),
  dimension: z.string().refine(isDimension, "Unknown grouping"),
  filter: z.string().max(4000).optional().default(""),
  shared: z.boolean().optional().default(true),
});

/** Shared reports, plus your own private ones. */
export async function listReports(teamId: string, userId: string) {
  return prisma.insightReport.findMany({
    where: { teamId, OR: [{ shared: true }, { ownerId: userId }] },
    orderBy: [{ name: "asc" }],
    take: MAX_REPORTS_PER_TEAM,
  });
}

export async function createReport(
  teamId: string,
  userId: string,
  input: unknown,
) {
  const data = reportSchema.parse(input);

  // A report can never hold a filter the engine would refuse to run.
  if (data.filter) parseFilter(JSON.parse(data.filter));
  const count = await prisma.insightReport.count({ where: { teamId } });

  if (count >= MAX_REPORTS_PER_TEAM) {
    throw new AuthError(
      `A team can keep up to ${MAX_REPORTS_PER_TEAM} saved reports. Delete one first.`,
      "LIMIT",
      409,
    );
  }

  return prisma.insightReport.create({
    data: { teamId, ownerId: userId, ...data },
  });
}

/** Only the author, or an admin, can delete a report. */
export async function deleteReport(
  teamId: string,
  userId: string,
  reportId: string,
  isAdmin: boolean,
) {
  const report = await prisma.insightReport.findFirst({
    where: { id: reportId, teamId },
    select: { ownerId: true, shared: true },
  });

  if (!report || (!report.shared && report.ownerId !== userId)) {
    throw new AuthError("Report not found", "NOT_FOUND", 404);
  }
  if (report.ownerId !== userId && !isAdmin) {
    throw new AuthError(
      "Only the author or an admin can delete this report",
      "FORBIDDEN",
      403,
    );
  }
  await prisma.insightReport.delete({ where: { id: reportId } });
}
