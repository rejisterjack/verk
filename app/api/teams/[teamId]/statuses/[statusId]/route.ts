import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import * as workflow from "@/lib/services/workflow";

type Ctx = { params: Promise<{ teamId: string; statusId: string }> };

/** Rename or recolor. Body: `{ name?, color? }`. Admins only. */
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const { teamId, statusId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const input = await request.json().catch(() => {
      throw new AuthError("Body must be valid JSON", "BAD_REQUEST", 400);
    });
    const updated = await workflow.updateWorkflowStatus(
      teamId,
      statusId,
      input,
      auth.role,
    );

    return Response.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Delete a status. `?moveTo=<statusId>` says where its issues go; it must be a status of the same
 * type (the first one is used when omitted). Admins only.
 */
export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const { teamId, statusId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    const moveTo = new URL(request.url).searchParams.get("moveTo");
    const result = await workflow.deleteWorkflowStatus(
      teamId,
      statusId,
      moveTo,
      auth.role,
    );

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
