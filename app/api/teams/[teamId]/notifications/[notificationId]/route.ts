import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import * as notifications from "@/lib/services/notifications";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ teamId: string; notificationId: string }>;
  },
) {
  try {
    const { teamId, notificationId } = await context.params;
    const authResult = await authenticateRequest(request, teamId);
    const body = (await request.json()) as {
      read?: boolean;
      snoozedUntil?: string | null;
    };

    if (body.read) {
      await notifications.markNotificationRead(
        authResult.user.id!,
        notificationId,
      );
    }
    if (body.snoozedUntil) {
      await notifications.snoozeNotification(
        authResult.user.id!,
        notificationId,
        new Date(body.snoozedUntil),
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
