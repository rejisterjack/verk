import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as notifications from "@/lib/services/notifications";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const authResult = await authenticateRequest(request, teamId);
    const items = await notifications.listInbox(authResult.user.id!, teamId);

    return Response.json({ notifications: items });
  } catch (error) {
    return jsonError(error);
  }
}
