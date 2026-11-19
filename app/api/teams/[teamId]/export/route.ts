import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { exportIssues, exportIssuesCsv } from "@/lib/services/export";

/**
 * `GET ?format=csv|json&archived=1`. Members and above; guests can't export. The response is a
 * download (`Content-Disposition: attachment`). Capped at 20,000 issues, and `X-Truncated: 1`
 * says when the cap was hit.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "MEMBER");
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("archived") === "1";
    const format = url.searchParams.get("format") === "json" ? "json" : "csv";
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `${auth.team.slug}-issues-${stamp}`;
    const actor = {
      id: auth.user.id!,
      name: auth.user.name,
      email: auth.user.email,
    };

    if (format === "json") {
      const { rows, truncated } = await exportIssues(teamId, auth.team.slug, {
        includeArchived,
        userId: auth.user.id,
      });

      await recordAudit({
        teamId,
        actor,
        action: "export.downloaded",
        targetType: "issues",
        summary: `Exported ${rows.length} issues as JSON`,
        metadata: { format: "json", count: rows.length, includeArchived },
      });

      return new Response(JSON.stringify({ issues: rows }, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}.json"`,
          "X-Truncated": truncated ? "1" : "0",
          "Cache-Control": "no-store",
        },
      });
    }
    const { csv, count, truncated } = await exportIssuesCsv(
      teamId,
      auth.team.slug,
      { includeArchived, userId: auth.user.id },
    );

    await recordAudit({
      teamId,
      actor,
      action: "export.downloaded",
      targetType: "issues",
      summary: `Exported ${count} issues as CSV`,
      metadata: { format: "csv", count, includeArchived },
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        "X-Truncated": truncated ? "1" : "0",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
