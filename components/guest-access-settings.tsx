"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setGuestProjectsAction } from "@/lib/actions/members";

type Guest = {
  membershipId: string;
  label: string;
  projectIds: string[];
};

/**
 * Guests normally see the whole team. Here an admin limits a guest to chosen projects; with none
 * ticked the guest sees everything again. The limit is enforced on the server for every read.
 */
export function GuestAccessSettings({
  teamSlug,
  guests,
  projects,
}: {
  teamSlug: string;
  guests: Guest[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(
      guests.map((g) => [g.membershipId, new Set(g.projectIds)]),
    ),
  );
  const [message, setMessage] = useState<string | null>(null);

  if (!guests.length) return null;

  function toggle(membershipId: string, projectId: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev[membershipId] ?? []);

      if (on) next.add(projectId);
      else next.delete(projectId);

      return { ...prev, [membershipId]: next };
    });
  }

  function save(membershipId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await setGuestProjectsAction(teamSlug, membershipId, [
        ...(selected[membershipId] ?? []),
      ]);

      setMessage(
        "error" in result ? (result.error ?? "Could not save") : "Saved",
      );
      if (!("error" in result)) router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold">Guest access</h3>
        <p className="text-[12px] text-muted">
          Limit a guest to specific projects. With none selected a guest sees
          the whole team.
        </p>
      </div>
      {guests.map((guest) => (
        <div
          key={guest.membershipId}
          className="space-y-2 rounded-lg border border-separator p-3 text-sm"
        >
          <p className="font-medium">{guest.label}</p>
          {projects.length === 0 ? (
            <p className="text-[12px] text-muted">No projects yet.</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {projects.map((project) => {
                const id = `guest-${guest.membershipId}-${project.id}`;

                return (
                  <div key={project.id} className="flex items-center gap-1.5">
                    <input
                      checked={
                        selected[guest.membershipId]?.has(project.id) ?? false
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                      id={id}
                      type="checkbox"
                      onChange={(e) =>
                        toggle(guest.membershipId, project.id, e.target.checked)
                      }
                    />
                    <label htmlFor={id}>{project.name}</label>
                  </div>
                );
              })}
            </div>
          )}
          <button
            className="h-8 rounded-md border border-separator px-3 text-[13px] hover:bg-default disabled:opacity-50"
            disabled={pending}
            type="button"
            onClick={() => save(guest.membershipId)}
          >
            Save
          </button>
        </div>
      ))}
      {message ? <p className="text-[12px] text-muted">{message}</p> : null}
    </section>
  );
}
