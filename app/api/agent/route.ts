import { z } from "zod";

import { parseAgentReply, refusesCodeWrite } from "@/lib/agent-json";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import { roleAtLeast } from "@/lib/roles";
import { resolveApiKey } from "@/lib/services/api-keys";
import * as issuesService from "@/lib/services/issues";

const bodySchema = z.object({
  teamId: z.string().min(1),
  prompt: z.string().min(1).max(4000),
});

/** The model gets this long before we give up with a 504. */
const MODEL_TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT =
  'Reply with JSON {"action":"create"|"update","number"?,"title"?,"description"?,"priority"?,"status"?,"assignee"?,"comment"?}. status is BACKLOG, TODO, IN_PROGRESS, DONE, or CANCELLED. priority is NONE, URGENT, HIGH, MEDIUM, or LOW. assignee is an email or name. Use update when the prompt names an existing issue number.';

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`agent:${ip}`)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const key = process.env.AI_API_KEY;

  if (!key) {
    return Response.json({ error: "Agent is not configured" }, { status: 404 });
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token.startsWith("verk_")) {
    return Response.json({ error: "API key required" }, { status: 401 });
  }

  // Bad input is the caller's fault: 400, never a 500.
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const bodyResult = bodySchema.safeParse(rawBody);

  if (!bodyResult.success) {
    return Response.json(
      { error: "teamId and prompt (max 4000 characters) are required" },
      { status: 400 },
    );
  }
  const body = bodyResult.data;

  if (refusesCodeWrite(body.prompt)) {
    return Response.json(
      { error: "This agent files issues. It does not write code." },
      { status: 400 },
    );
  }

  const apiKey = await resolveApiKey(token);

  if (!apiKey || apiKey.teamId !== body.teamId) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }
  // The agent acts with the key's effective role, never more. Read-only keys can't file issues.
  const role = apiKey.effectiveRole;

  if (!roleAtLeast(role, "MEMBER")) {
    return Response.json(
      { error: "This API key is read-only" },
      { status: 403 },
    );
  }

  let response: Response;

  try {
    response = await fetch(
      process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL ?? "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: body.prompt },
          ],
        }),
        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      },
    );
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return Response.json(
      { error: timedOut ? "Agent timed out" : "Agent request failed" },
      { status: timedOut ? 504 : 502 },
    );
  }

  if (!response.ok) {
    return Response.json({ error: "Agent request failed" }, { status: 502 });
  }
  let payload: { choices?: { message?: { content?: string } }[] };

  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return Response.json(
      { error: "Agent returned an invalid response" },
      { status: 502 },
    );
  }
  const parsedReply = parseAgentReply(
    payload.choices?.[0]?.message?.content ?? "",
  );

  if (!parsedReply.ok) {
    return Response.json({ error: parsedReply.error }, { status: 502 });
  }
  const parsed = parsedReply.reply;

  if (parsed.action === "update" && parsed.number) {
    const existing = await issuesService.getIssueByNumber(
      body.teamId,
      parsed.number,
    );

    if (!existing) {
      return Response.json({ error: "Issue not found" }, { status: 404 });
    }
    const assignee = parsed.assignee
      ? await prisma.user.findFirst({
          where: {
            disabled: false,
            OR: [
              { email: { equals: parsed.assignee, mode: "insensitive" } },
              { name: { equals: parsed.assignee, mode: "insensitive" } },
            ],
          },
        })
      : null;
    const issue = await issuesService.updateIssue(
      body.teamId,
      existing.id,
      {
        ...(parsed.title ? { title: parsed.title } : {}),
        ...(parsed.status ? { status: parsed.status } : {}),
        ...(parsed.priority ? { priority: parsed.priority } : {}),
        ...(assignee ? { assigneeId: assignee.id } : {}),
      },
      role,
      apiKey.createdById,
    );

    if (parsed.comment) {
      const { addComment } = await import("@/lib/services/comments");

      await addComment(body.teamId, existing.id, apiKey.createdById, {
        body: parsed.comment,
      });
    }

    return Response.json({ issue });
  }

  const issue = await issuesService.createIssue(
    body.teamId,
    apiKey.createdById,
    {
      title: parsed.title || "Agent issue",
      description: parsed.description,
      priority: parsed.priority ?? "NONE",
      status: parsed.status ?? "BACKLOG",
    },
  );

  return Response.json({ issue });
}
