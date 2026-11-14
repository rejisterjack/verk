import { rateLimitShared } from "@/lib/rate-limit";
import {
  buildUnfurls,
  type LinkSharedEvent,
  sendUnfurls,
} from "@/lib/services/slack-unfurl";
import {
  handleAppMention,
  isSlackRetry,
  type EventCallback,
} from "@/lib/services/slack-events";
import { verifySlackSignature } from "@/lib/slack";

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

  let body: EventCallback;

  try {
    body = JSON.parse(raw) as EventCallback;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.type === "url_verification") {
    return Response.json({ challenge: body.challenge ?? "" });
  }

  // Slack re-sends an event if we take longer than 3s. The first delivery did the work.
  if (isSlackRetry(request.headers))
    return Response.json({ ok: true, retry: true });

  if (body.type === "event_callback") {
    try {
      if (body.event?.type === "link_shared") {
        // Preview cards for pasted issue links (needs the `links:read` and `links:write` scopes).
        const host = new URL(
          process.env.AUTH_URL ??
            `https://${request.headers.get("host") ?? ""}`,
        ).host;
        const event = body.event as LinkSharedEvent;
        const unfurls = await buildUnfurls(body.team_id, event, host);

        await sendUnfurls(process.env.SLACK_BOT_TOKEN ?? "", event, unfurls);
      } else {
        await handleAppMention(body);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Slack event failed", error);
    }
  }

  // Always 200 so Slack does not keep retrying.
  return Response.json({ ok: true });
}
