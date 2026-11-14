/**
 * Notification preferences: which kinds of notification a person has muted. Pure helpers so the
 * settings screen, the services that create notifications and tests agree on the list.
 */

export const NOTIFICATION_TYPES = [
  {
    id: "ASSIGNED",
    label: "Assigned to you",
    hint: "An issue is assigned to you, or lands in your triage queue",
  },
  {
    id: "MENTIONED",
    label: "Mentions",
    hint: "Someone @-mentions you in a comment",
  },
  {
    id: "COMMENTED",
    label: "Comments",
    hint: "New comments on issues you follow",
  },
  {
    id: "STATUS_CHANGED",
    label: "Status changes",
    hint: "An issue you follow changes status",
  },
  {
    id: "SUBSCRIBED",
    label: "Subscriptions",
    hint: "Other activity on issues you follow",
  },
] as const;

export type NotificationTypeId = (typeof NOTIFICATION_TYPES)[number]["id"];

const VALID = new Set<string>(NOTIFICATION_TYPES.map((t) => t.id));

/** Keep only known types, once each, in a stable order. Anything else is dropped. */
export function normalizeMuted(input: unknown): NotificationTypeId[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();

  for (const value of input) {
    if (typeof value === "string" && VALID.has(value)) seen.add(value);
  }

  return NOTIFICATION_TYPES.filter((t) => seen.has(t.id)).map((t) => t.id);
}

/** Of `userIds`, those who have not muted `type`. `prefs` maps user id to their muted types. */
export function unmutedRecipients(
  userIds: string[],
  type: string,
  prefs: Map<string, string[]>,
): string[] {
  return userIds.filter((id) => !(prefs.get(id) ?? []).includes(type));
}
