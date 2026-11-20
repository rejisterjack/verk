import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Every action name that can appear in the log. Keep this the single list the UI filters by. */
export const AUDIT_ACTIONS = {
  "member.role_changed": "Changed a member's role",
  "member.removed": "Removed a member",
  "member.left": "Left the team",
  "invite.created": "Invited someone",
  "invite.revoked": "Revoked an invite",
  "api_key.created": "Created an API key",
  "api_key.revoked": "Revoked an API key",
  "webhook.created": "Created a webhook",
  "webhook.deleted": "Deleted a webhook",
  "webhook.disabled": "Disabled a webhook",
  "webhook.enabled": "Enabled a webhook",
  "team.updated": "Changed team settings",
  "team.deleted": "Deleted the team",
  "workflow.changed": "Changed the workflow",
  "oauth_app.created": "Registered an OAuth app",
  "oauth_app.deleted": "Deleted an OAuth app",
  "automation.created": "Created an automation",
  "automation.toggled": "Enabled or disabled an automation",
  "automation.deleted": "Deleted an automation",
  "export.downloaded": "Exported issues",
  "import.completed": "Imported issues from a file",
  "ask_link.rotated": "Created or rotated the public ask link",
  "ask_link.toggled": "Enabled or disabled the public ask link",
  "two_factor.enabled": "Turned on two-factor sign-in",
  "two_factor.disabled": "Turned off two-factor sign-in",
  "two_factor.recovery_regenerated": "Made new two-factor recovery codes",
  "two_factor.recovery_used": "Signed in with a two-factor recovery code",
  "agent_claim.released": "Took an issue back from a coding agent",
  "passkey.added": "Added a passkey",
  "passkey.removed": "Removed a passkey",
  "issue.restricted": "Restricted who can see an issue",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export type AuditEvent = {
  teamId: string;
  action: AuditAction;
  actor?: { id: string; name?: string | null; email?: string | null } | null;
  targetType?: string;
  targetId?: string | null;
  summary?: string;
  /** Small, non-secret facts (old and new role, key prefix). Never put tokens or secrets here. */
  metadata?: Record<string, unknown>;
};

const MAX_SUMMARY = 300;
const SECRET_KEY = /secret|token|password|hash|key(?!_?prefix)/i;

/** Drop anything that looks like a credential, so a careless caller can't leak one into the log. */
export function scrubMetadata(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const out: Record<string, Prisma.InputJsonValue | null> = {};

  for (const [name, value] of Object.entries(metadata)) {
    if (SECRET_KEY.test(name)) continue;
    if (value === undefined) continue;
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[name] =
        typeof value === "string" ? value.slice(0, 500) : (value as never);
    } else {
      out[name] = JSON.stringify(value).slice(0, 500);
    }
  }

  return out as Prisma.InputJsonValue;
}

export function actorLabel(actor: AuditEvent["actor"]): string {
  if (!actor) return "System";

  return actor.name ? `${actor.name}` : (actor.email ?? "Unknown");
}

/**
 * Record an account-level event (not tied to one team) in every team the person belongs to, so
 * an admin reviewing a team's log can see that a member's sign-in security changed. Best effort,
 * like `recordAudit`.
 */
export async function recordUserAudit(
  user: { id: string; name?: string | null; email?: string | null },
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { teamId: true },
      take: 50,
    });

    await Promise.all(
      memberships.map((membership) =>
        recordAudit({
          teamId: membership.teamId,
          action,
          actor: user,
          targetType: "user",
          targetId: user.id,
          ...(metadata ? { metadata } : {}),
        }),
      ),
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- the only trace left when a log write fails
    console.error("audit log write failed", action, error);
  }
}

/**
 * Write one audit row. Best effort: a logging failure must never block or undo the action that
 * was being logged, so errors are swallowed (and printed for the server logs).
 */
export async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    let actor = event.actor;

    if (actor?.id && !actor.name && !actor.email) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { id: true, name: true, email: true },
      });

      if (user) actor = user;
    }

    await prisma.auditLog.create({
      data: {
        teamId: event.teamId,
        actorId: actor?.id ?? null,
        actorLabel: actorLabel(actor).slice(0, 120),
        action: event.action,
        targetType: event.targetType ?? "",
        targetId: event.targetId ?? null,
        summary: (event.summary ?? AUDIT_ACTIONS[event.action]).slice(
          0,
          MAX_SUMMARY,
        ),
        metadata: scrubMetadata(event.metadata),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- the only trace left when a log write fails
    console.error("audit log write failed", event.action, error);
  }
}
