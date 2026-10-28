import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import { addComment } from "@/lib/services/comments";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) return new Response(null, { status: 404 });

  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;

  if (!signature || !safeEqual(signature, expected)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw) as {
    action?: string;
    pull_request?: { title?: string; head?: { ref?: string } };
    repository?: { full_name?: string };
  };

  if (event.action !== "opened" && event.action !== "edited" && event.action !== "closed") {
    return Response.json({ ok: true, skipped: true });
  }

  const repo = event.repository?.full_name;
  const text = `${event.pull_request?.title ?? ""} ${event.pull_request?.head?.ref ?? ""}`;
  const match = text.match(/([A-Za-z0-9]+)-(\d+)/);

  if (!repo || !match) return Response.json({ ok: true, linked: false });

  const number = Number(match[2]);
  const team = await prisma.team.findFirst({
    where: { githubRepo: repo },
  });

  if (!team) return Response.json({ ok: true, linked: false });

  const issue = await prisma.issue.findFirst({
    where: { teamId: team.id, number },
  });

  if (!issue) return Response.json({ ok: true, linked: false });

  const owner = await prisma.membership.findFirst({
    where: { teamId: team.id, role: "OWNER" },
  });

  if (!owner) return Response.json({ ok: true, linked: false });

  await addComment(team.id, issue.id, owner.userId, {
    body: `GitHub pull request mentions ${match[0]} in ${repo}.`,
  });

  const merged =
    event.action === "closed" &&
    (event.pull_request as { merged?: boolean } | undefined)?.merged;

  if (merged && team.githubMergeCompletes) {
    const { updateIssue } = await import("@/lib/services/issues");

    await updateIssue(team.id, issue.id, { status: "DONE" }, "OWNER", owner.userId);
  }

  return Response.json({ ok: true, linked: true });
}
