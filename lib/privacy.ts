/**
 * Privacy rules, kept pure so they can be checked without a database.
 *
 * Erasing an account anonymizes it instead of deleting the row. Most of what a person created
 * (issues, comments) belongs to their team and is wanted by the people still using it, and a
 * hard delete would cascade through all of it. So the person's identity is removed (name, email,
 * avatar, password, sessions, linked sign-ins, keys, passkeys, 2FA, drafts) and what remains
 * shows as "Deleted user".
 */

export const DELETED_USER_NAME = "Deleted user";

/** A placeholder email that can never receive mail and never collides with a real one. */
export function anonymousEmail(userId: string): string {
  return `deleted-${userId}@deleted.invalid`;
}

export function isAnonymized(email: string): boolean {
  return email.endsWith("@deleted.invalid");
}

/** What blocks erasing an account. A sole owner must hand the team over or delete it first. */
export function erasureBlockers(
  memberships: { teamName: string; role: string; owners: number }[],
): string[] {
  return memberships
    .filter((m) => m.role === "OWNER" && m.owners <= 1)
    .map(
      (m) =>
        `You are the only owner of "${m.teamName}". Make someone else an owner or delete the team first.`,
    );
}

export type AuditRetention = 30 | 90 | 180 | 365 | 730 | 0;
export const RETENTION_CHOICES: { days: AuditRetention; label: string }[] = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "180 days" },
  { days: 365, label: "1 year (default)" },
  { days: 730, label: "2 years" },
  { days: 0, label: "Keep forever" },
];
export const DEFAULT_RETENTION_DAYS = 365;

export function parseRetention(value: unknown): AuditRetention {
  const n = Number(value);

  return RETENTION_CHOICES.some((choice) => choice.days === n)
    ? (n as AuditRetention)
    : DEFAULT_RETENTION_DAYS;
}

/** The oldest date an audit entry may have, or null when the team keeps entries forever. */
export function retentionCutoff(days: number, now = new Date()): Date | null {
  return days > 0 ? new Date(now.getTime() - days * 86_400_000) : null;
}
