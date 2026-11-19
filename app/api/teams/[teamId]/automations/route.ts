import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import * as automations from "@/lib/services/automations";

/** List the team's automations. Admins only. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;

    await authenticateRequest(request, teamId, "ADMIN");

    return Response.json({
      automations: await automations.listAutomations(teamId),
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Create one. Body: `{ name, trigger, conditions?, actions: [{ type, ... }], enabled? }` where
 * `conditions` is an issue filter tree (same shape as `?filter=` on the issues API).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "ADMIN");
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AuthError("Body must be valid JSON", "BAD_REQUEST", 400);
    }
    const created = await automations.createAutomation(
      teamId,
      auth.user.id!,
      body,
      auth.role,
      { id: auth.user.id!, name: auth.user.name, email: auth.user.email },
    );

    return Response.json(created, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
