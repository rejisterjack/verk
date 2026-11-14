"use client";

import { useState, useTransition } from "react";

import { saveNotificationPrefsAction } from "@/lib/actions/notifications";
import {
  NOTIFICATION_TYPES,
  type NotificationTypeId,
} from "@/lib/notification-prefs";

/** One switch per notification type; turning one off mutes it for you on every team. */
export function NotificationSettings({
  teamSlug,
  initialMuted,
}: {
  teamSlug: string;
  initialMuted: NotificationTypeId[];
}) {
  const [muted, setMuted] = useState<Set<string>>(new Set(initialMuted));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string, on: boolean) {
    const next = new Set(muted);

    if (on) next.delete(id);
    else next.add(id);
    const previous = muted;

    setMuted(next);
    setMessage(null);
    startTransition(async () => {
      const result = await saveNotificationPrefsAction(teamSlug, [...next]);

      if ("error" in result) {
        setMuted(previous);
        setMessage(result.error ?? "Could not save");
      } else {
        setMessage("Saved");
      }
    });
  }

  return (
    <div className="space-y-1 text-sm">
      {NOTIFICATION_TYPES.map((type) => {
        const on = !muted.has(type.id);
        const id = `notify-${type.id}`;

        return (
          <div
            key={type.id}
            className="flex items-start gap-3 rounded-md px-1 py-2"
          >
            <input
              checked={on}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent)]"
              disabled={pending}
              id={id}
              type="checkbox"
              onChange={(e) => toggle(type.id, e.target.checked)}
            />
            <label className="cursor-pointer" htmlFor={id}>
              <span className="font-medium">{type.label}</span>
              <span className="block text-[12px] text-muted">{type.hint}</span>
            </label>
          </div>
        );
      })}
      <p aria-live="polite" className="h-4 pt-1 text-[12px] text-muted">
        {pending ? "Saving…" : message}
      </p>
    </div>
  );
}
