"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";

type SearchIssue = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
};

type Member = { id: string; name: string | null; email: string };

export function CommandPalette({
  teamSlug,
  teamId,
  open,
  onOpenChange,
  onCreateIssue,
}: {
  teamSlug: string;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateIssue: () => void;
}) {
  const router = useRouter();
  const base = `/t/${teamSlug}`;
  const [query, setQuery] = useState("");
  const [issues, setIssues] = useState<SearchIssue[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<SearchIssue | null>(null);

  const go = useCallback(
    (path: string) => {
      onOpenChange(false);
      setSelectedIssue(null);
      setQuery("");
      router.push(path);
    },
    [onOpenChange, router],
  );

  useEffect(() => {
    if (!open || !teamId) return;
    void fetch(`/api/teams/${teamId}/members`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.members) {
          setMembers(
            data.members.map(
              (m: { user: Member }) => m.user ?? m,
            ) as Member[],
          );
        }
      })
      .catch(() => undefined);
  }, [open, teamId]);

  useEffect(() => {
    if (!open || !teamId) return;
    if (query.trim().length < 1) {
      setIssues([]);

      return;
    }
    const handle = window.setTimeout(() => {
      void fetch(
        `/api/teams/${teamId}/issues?search=${encodeURIComponent(query)}&take=8`,
        { credentials: "same-origin" },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setIssues(data?.issues ?? []))
        .catch(() => setIssues([]));
    }, 150);

    return () => window.clearTimeout(handle);
  }, [query, open, teamId]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIssue(null);
    }
  }, [open]);

  async function patchIssue(issueId: string, body: Record<string, unknown>) {
    await fetch(`/api/teams/${teamId}/issues/${issueId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onOpenChange(false);
    router.refresh();
  }

  async function saveCurrentView() {
    const params = new URLSearchParams(window.location.search);
    const filterJson: Record<string, string> = {};

    for (const key of ["status", "priority", "cycleId", "search", "assignee"]) {
      const v = params.get(key);

      if (v) filterJson[key === "assignee" ? "assigneeId" : key] = v;
    }
    const name = window.prompt("View name");

    if (!name?.trim()) return;
    await fetch(`/api/teams/${teamId}/views`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        filterJson,
        layout: params.get("layout") === "board" ? "BOARD" : "LIST",
        pinned: true,
      }),
    });
    onOpenChange(false);
    router.refresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 pt-[15vh] px-4">
      <button
        aria-label="Close command menu"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={() => onOpenChange(false)}
      />
      <Command
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-separator bg-background shadow-2xl"
        label="Command menu"
        shouldFilter={!selectedIssue}
      >
        <Command.Input
          ref={(el) => {
            el?.focus();
          }}
          className="w-full border-b border-separator bg-transparent px-4 py-3 text-sm outline-none"
          placeholder={
            selectedIssue
              ? `Actions for ${teamSlug.slice(0, 3).toUpperCase()}-${selectedIssue.number}…`
              : "Type a command or search issues…"
          }
          value={query}
          onValueChange={setQuery}
        />
        <Command.List className="max-h-80 overflow-auto p-2 text-sm">
          <Command.Empty className="px-3 py-6 text-center text-muted">
            No results
          </Command.Empty>

          {selectedIssue ? (
            <>
              <Command.Group
                className="text-xs text-muted"
                heading="Set status"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <Command.Item
                    key={value}
                    className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                    onSelect={() =>
                      void patchIssue(selectedIssue.id, { status: value })
                    }
                  >
                    Status → {label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group
                className="mt-2 text-xs text-muted"
                heading="Set priority"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <Command.Item
                    key={value}
                    className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                    onSelect={() =>
                      void patchIssue(selectedIssue.id, { priority: value })
                    }
                  >
                    Priority → {label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group
                className="mt-2 text-xs text-muted"
                heading="Assign"
              >
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() =>
                    void patchIssue(selectedIssue.id, { assigneeId: null })
                  }
                >
                  Unassigned
                </Command.Item>
                {members.map((m) => (
                  <Command.Item
                    key={m.id}
                    className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                    onSelect={() =>
                      void patchIssue(selectedIssue.id, { assigneeId: m.id })
                    }
                  >
                    {m.name ?? m.email}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Item
                className="mt-2 flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                onSelect={() => {
                  setSelectedIssue(null);
                  setQuery("");
                }}
              >
                ← Back
              </Command.Item>
            </>
          ) : (
            <>
              {issues.length ? (
                <Command.Group
                  className="text-xs text-muted"
                  heading="Issues"
                >
                  {issues.map((issue) => (
                    <Command.Item
                      key={issue.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                      value={`${issue.number} ${issue.title}`}
                      onSelect={() => {
                        setSelectedIssue(issue);
                        setQuery("");
                      }}
                    >
                      <span>
                        <span className="text-muted">
                          {teamSlug.slice(0, 3).toUpperCase()}-{issue.number}
                        </span>{" "}
                        {issue.title}
                      </span>
                      <button
                        className="text-xs text-accent"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          go(`${base}/issues/${issue.number}`);
                        }}
                      >
                        Open
                      </button>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
              <Command.Group className="text-xs text-muted" heading="Navigate">
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/inbox`)}
                >
                  Go to Inbox
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/issues?assignee=me`)}
                >
                  Go to My issues
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/triage`)}
                >
                  Go to Triage
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/issues`)}
                >
                  Go to Issues
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/issues?layout=board`)}
                >
                  Go to Board
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/projects`)}
                >
                  Go to Projects
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/cycles`)}
                >
                  Go to Cycles
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => go(`${base}/settings/import`)}
                >
                  Import from Linear
                </Command.Item>
              </Command.Group>
              <Command.Group
                className="mt-2 text-xs text-muted"
                heading="Actions"
              >
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => {
                    onOpenChange(false);
                    onCreateIssue();
                  }}
                >
                  Create issue
                </Command.Item>
                <Command.Item
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2 aria-selected:bg-accent/15"
                  onSelect={() => void saveCurrentView()}
                >
                  Save current filters as view
                </Command.Item>
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
