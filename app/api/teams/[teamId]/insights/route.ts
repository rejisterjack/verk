import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import { DIMENSIONS, isDimension, isMeasure, MEASURES } from "@/lib/insights";
import { rateLimitShared } from "@/lib/rate-limit";
import { runInsight } from "@/lib/services/insights";

/**
 * `GET ?measure=count&dimension=assignee&filter=<json>`. Measures: count, points, avg_age_days,
 * avg_cycle_days, avg_lead_days. Dimensions: status, priority, assignee, project, cycle, label,
 * created_week, completed_week. `filter` is the same JSON tree as on the issues API.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "GUEST");
    const limited = await rateLimitShared(
      `insights:${auth.user.id}`,
      30,
      60_000,
    );

    if (!limited.ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
    const q = new URL(request.url).searchParams;
    const measure = q.get("measure") ?? "count";
    const dimension = q.get("dimension") ?? "status";

    if (!isMeasure(measure) || !isDimension(dimension)) {
      throw new AuthError(
        `measure must be one of ${MEASURES.map((m) => m.id).join(", ")}; dimension one of ${DIMENSIONS.map((d) => d.id).join(", ")}`,
        "BAD_REQUEST",
        400,
      );
    }

    return Response.json(
      await runInsight(teamId, auth.user.id, {
        measure,
        dimension,
        filter: q.get("filter") ?? undefined,
        includeArchived: q.get("archived") === "1",
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}
