import { z } from "zod";

export function refusesCodeWrite(prompt: string) {
  return /\b(pull request|merge|commit|push code|open a pr)\b/i.test(prompt);
}

export function extractAgentJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? content).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start < 0 || end < start) {
    throw new Error("Agent did not return JSON");
  }

  return JSON.parse(raw.slice(start, end + 1));
}

/** The only shapes the issue agent may act on. Anything else is rejected, never guessed. */
export const agentReplySchema = z.object({
  action: z.enum(["create", "update"]).optional(),
  number: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional().default(""),
  priority: z.enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  status: z
    .enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"])
    .optional(),
  comment: z.string().optional(),
  assignee: z.string().optional(),
});

export type AgentReply = z.infer<typeof agentReplySchema>;

/** Turn a raw model reply into a validated action, or say why it is unusable. Never throws. */
export function parseAgentReply(
  content: string,
): { ok: true; reply: AgentReply } | { ok: false; error: string } {
  let json: unknown;

  try {
    json = extractAgentJson(content);
  } catch {
    return { ok: false, error: "The agent did not return JSON" };
  }
  const parsed = agentReplySchema.safeParse(json);

  if (!parsed.success) {
    return { ok: false, error: "The agent returned an invalid action" };
  }

  return { ok: true, reply: parsed.data };
}
