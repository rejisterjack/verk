import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import * as workflow from "@/lib/services/workflow";

type Ctx = { params: Promise<{ teamId: string }> };

async function body(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new AuthError("Body must be valid JSON", "BAD_REQUEST", 400);
  }
}

/** The team's workflow statuses in board order, each with its type and color. */
export async function GET(request: NextRequest, context: Ctx) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "GUEST");
    const statuses = await workflow.getWorkflow(teamId);

    return Response.json({
      statuses: statuses.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        type: s.type,
        color: s.color,
        position: s.position,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** Create a status. Body: `{ name, type, color? }`. Admins only. */
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const created = await workflow.createWorkflowStatus(
      teamId,
      await body(request),
      auth.role,
    );

    return Response.json(created, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

/** Reorder. Body: `{ order: string[] }`, every status id once. Admins only. */
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const input = (await body(request)) as { order?: unknown };

    if (!Array.isArray(input.order)) {
      throw new AuthError(
        "order must be a list of status ids",
        "BAD_REQUEST",
        400,
      );
    }
    await workflow.reorderWorkflow(teamId, input.order.map(String), auth.role);

    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
