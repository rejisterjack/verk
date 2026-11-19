import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { exportAuditCsv } from "@/lib/services/audit";

/** The audit log as CSV, for an auditor. Admins only. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const csv = await exportAuditCsv(teamId);

    await recordAudit({
      teamId,
      action: "export.downloaded",
      actor: auth.user,
      summary: "Downloaded the audit log",
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="verk-audit-log.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
