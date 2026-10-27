"use client";

import type { LocalIssue } from "@/lib/offline/db";

import { Button } from "@heroui/react";

import {
  resolveConflictKeepMine,
  resolveConflictKeepServer,
} from "@/lib/offline/issue-repository";

export function ConflictModal({
  issue,
  teamId,
  onClose,
}: {
  issue: LocalIssue;
  teamId: string;
  onClose: () => void;
}) {
  const local = issue.conflictLocal;

  if (!local) return null;

  async function keepServer() {
    await resolveConflictKeepServer(issue.id);
    onClose();
  }

  async function keepMine() {
    await resolveConflictKeepMine(teamId, issue.id, {
      title: local?.title as string | undefined,
      description: local?.description as string | undefined,
      status: local?.status as string | undefined,
      priority: local?.priority as string | undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-separator bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Resolve sync conflict</h2>
        <p className="mt-1 text-sm text-muted">
          This issue changed on the server while your edit was queued.
        </p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-separator p-3">
            <p className="text-xs font-semibold uppercase text-muted">
              Server version
            </p>
            <p className="mt-2 font-medium">{issue.title}</p>
            <p className="mt-1 text-xs text-muted">
              {issue.status} · {issue.priority}
            </p>
            <p className="mt-2 line-clamp-4 text-xs text-muted">
              {issue.description || "No description"}
            </p>
          </div>
          <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
            <p className="text-xs font-semibold uppercase text-muted">
              Your version
            </p>
            <p className="mt-2 font-medium">{String(local.title ?? "")}</p>
            <p className="mt-1 text-xs text-muted">
              {String(local.status ?? "")} · {String(local.priority ?? "")}
            </p>
            <p className="mt-2 line-clamp-4 text-xs text-muted">
              {String(local.description ?? "No description")}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="tertiary" onPress={keepServer}>
            Keep server
          </Button>
          <Button onPress={keepMine}>Keep mine</Button>
        </div>
      </div>
    </div>
  );
}
