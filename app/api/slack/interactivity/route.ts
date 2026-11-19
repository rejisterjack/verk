import { rateLimitShared } from "@/lib/rate-limit";
import {
  handleMessageShortcut,
  type MessageActionPayload,
} from "@/lib/services/slack-events";
import { verifySlackSignature } from "@/lib/slack";

/** Slack sends shortcuts and buttons here as `application/x-www-form-urlencoded` with a `payload` JSON field. */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`slack:${ip}`)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
    return Response.json({ error: "Slack is not configured" }, { status: 404 });
  }
  const raw = await request.text();

  if (
    !verifySlackSignature(
      process.env.SLACK_SIGNING_SECRET,
      raw,
      request.headers.get("x-slack-request-timestamp") ?? "",
      request.headers.get("x-slack-signature") ?? "",
    )
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: MessageActionPayload;

  try {
    payload = JSON.parse(
      new URLSearchParams(raw).get("payload") ?? "",
    ) as MessageActionPayload;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.type === "message_action") {
    try {
      await handleMessageShortcut(payload);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Slack shortcut failed", error);
    }
  }

  // An empty 200 acknowledges the interaction. The reply goes to response_url.
  return new Response(null, { status: 200 });
}
