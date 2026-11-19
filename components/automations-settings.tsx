"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createAutomationAction,
  deleteAutomationAction,
  toggleAutomationAction,
} from "@/lib/actions/automations";
import { TRIGGERS } from "@/lib/automations";

type Named = { id: string; name: string };
type Row = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  summary: string;
  runCount: number;
  lastRunAt: string | null;
};
type Options = {
  members: { id: string; name: string | null; email: string }[];
  labels: Named[];
  cycles: Named[];
  projects: Named[];
};

const STATUSES = [
  ["BACKLOG", "Backlog"],
  ["TODO", "Todo"],
  ["IN_PROGRESS", "In progress"],
  ["DONE", "Done"],
  ["CANCELLED", "Cancelled"],
] as const;
const PRIORITIES = [
  ["URGENT", "Urgent"],
  ["HIGH", "High"],
  ["MEDIUM", "Medium"],
  ["LOW", "Low"],
  ["NONE", "No priority"],
] as const;

const COND_FIELDS = [
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "assignee", label: "Assignee" },
  { id: "label", label: "Label" },
  { id: "project", label: "Project" },
  { id: "title", label: "Title contains" },
] as const;

const ACTION_TYPES = [
  ["set_status", "Set status"],
  ["set_priority", "Set priority"],
  ["set_assignee", "Assign to"],
  ["add_label", "Add label"],
  ["remove_label", "Remove label"],
  ["set_cycle", "Move to cycle"],
  ["set_project", "Move to project"],
  ["add_comment", "Add comment"],
  ["notify", "Notify"],
] as const;

type CondDraft = { field: string; op: string; value: string };
type ActionDraft = { type: string; value: string };

const inputClass =
  "h-8 rounded-md border border-separator bg-transparent px-2 text-[13px]";

/** The rows of an action's value picker for the given action type. */
function valueOptions(type: string, options: Options): [string, string][] {
  switch (type) {
    case "set_status":
      return STATUSES.map(([v, l]) => [v, l]);
    case "set_priority":
      return PRIORITIES.map(([v, l]) => [v, l]);
    case "set_assignee":
      return [
        ["", "Nobody"],
        ...options.members.map((m): [string, string] => [
          m.id,
          m.name ?? m.email,
        ]),
      ];
    case "notify":
      return options.members.map((m): [string, string] => [
        m.id,
        m.name ?? m.email,
      ]);
    case "add_label":
    case "remove_label":
      return options.labels.map((l): [string, string] => [l.id, l.name]);
    case "set_cycle":
      return [
        ["", "No cycle"],
        ...options.cycles.map((c): [string, string] => [c.id, c.name]),
      ];
    case "set_project":
      return [
        ["", "No project"],
        ...options.projects.map((p): [string, string] => [p.id, p.name]),
      ];
    default:
      return [];
  }
}

function buildAction(draft: ActionDraft) {
  switch (draft.type) {
    case "set_status":
      return { type: "set_status", status: draft.value };
    case "set_priority":
      return { type: "set_priority", priority: draft.value };
    case "set_assignee":
      return { type: "set_assignee", assigneeId: draft.value || null };
    case "add_label":
    case "remove_label":
      return { type: draft.type, labelId: draft.value };
    case "set_cycle":
      return { type: "set_cycle", cycleId: draft.value || null };
    case "set_project":
      return { type: "set_project", projectId: draft.value || null };
    case "add_comment":
      return { type: "add_comment", body: draft.value };
    case "notify":
      return { type: "notify", userId: draft.value };
    default:
      return { type: draft.type };
  }
}

export function AutomationsSettings({
  teamSlug,
  automations,
  options,
}: {
  teamSlug: string;
  automations: Row[];
  options: Options;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<string>(TRIGGERS[0].id);
  const [conds, setConds] = useState<CondDraft[]>([]);
  const [acts, setActs] = useState<ActionDraft[]>([
    { type: "set_priority", value: "HIGH" },
  ]);

  function condValues(field: string): [string, string][] {
    switch (field) {
      case "status":
        return STATUSES.map(([v, l]) => [v, l]);
      case "priority":
        return PRIORITIES.map(([v, l]) => [v, l]);
      case "assignee":
        return options.members.map((m): [string, string] => [
          m.id,
          m.name ?? m.email,
        ]);
      case "label":
        return options.labels.map((l): [string, string] => [l.id, l.name]);
      case "project":
        return options.projects.map((p): [string, string] => [p.id, p.name]);
      default:
        return [];
    }
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await createAutomationAction(teamSlug, {
        name,
        trigger,
        conditions: conds.map((c) => ({
          field: c.field,
          // Label conditions use "includes any"; the rest are plain "is" / "contains".
          op:
            c.field === "label"
              ? "includes_any"
              : c.field === "title"
                ? "contains"
                : "is",
          value: c.value,
        })),
        actions: acts.map(buildAction),
      });

      if ("error" in result) {
        setError(result.error ?? "Could not save");

        return;
      }
      setName("");
      setConds([]);
      setActs([{ type: "set_priority", value: "HIGH" }]);
      router.refresh();
    });
  }

  function toggle(id: string, enabled: boolean) {
    startTransition(async () => {
      const result = await toggleAutomationAction(teamSlug, id, enabled);

      if ("error" in result) setError(result.error ?? "Could not update");
      else router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this automation?")) return;
    startTransition(async () => {
      const result = await deleteAutomationAction(teamSlug, id);

      if ("error" in result) setError(result.error ?? "Could not delete");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6 text-sm">
      <section>
        {automations.length === 0 ? (
          <p className="text-muted">No automations yet.</p>
        ) : (
          <ul className="divide-y divide-separator rounded-lg border border-separator">
            {automations.map((rule) => (
              <li key={rule.id} className="flex items-start gap-3 px-3 py-2.5">
                <input
                  aria-label={`Enable ${rule.name}`}
                  checked={rule.enabled}
                  className="mt-1 h-4 w-4 cursor-pointer accent-[var(--accent)]"
                  disabled={pending}
                  type="checkbox"
                  onChange={(e) => toggle(rule.id, e.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      rule.enabled ? "font-medium" : "font-medium text-muted"
                    }
                  >
                    {rule.name}
                  </p>
                  <p className="text-[12px] text-muted">{rule.summary}</p>
                  <p className="text-[11px] text-muted">
                    Ran {rule.runCount} time{rule.runCount === 1 ? "" : "s"}
                    {rule.lastRunAt
                      ? ` · last ${rule.lastRunAt.slice(0, 16).replace("T", " ")}`
                      : ""}
                  </p>
                </div>
                <button
                  className="text-xs text-danger"
                  disabled={pending}
                  type="button"
                  onClick={() => remove(rule.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-separator p-3">
        <h2 className="font-medium">New automation</h2>
        <input
          aria-label="Automation name"
          className={`${inputClass} w-full`}
          maxLength={100}
          placeholder="Name, for example: Urgent bugs go to triage"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">When</span>
          <select
            aria-label="Trigger"
            className={inputClass}
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
          >
            {TRIGGERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-muted">
            And the issue matches {conds.length ? "all of" : "(any issue)"}
          </p>
          {conds.map((cond, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Condition field"
                className={inputClass}
                value={cond.field}
                onChange={(e) =>
                  setConds((list) =>
                    list.map((c, i) =>
                      i === index
                        ? { field: e.target.value, op: "is", value: "" }
                        : c,
                    ),
                  )
                }
              >
                {COND_FIELDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              {cond.field === "title" ? (
                <input
                  aria-label="Title text"
                  className={inputClass}
                  value={cond.value}
                  onChange={(e) =>
                    setConds((list) =>
                      list.map((c, i) =>
                        i === index ? { ...c, value: e.target.value } : c,
                      ),
                    )
                  }
                />
              ) : (
                <select
                  aria-label="Condition value"
                  className={inputClass}
                  value={cond.value}
                  onChange={(e) =>
                    setConds((list) =>
                      list.map((c, i) =>
                        i === index ? { ...c, value: e.target.value } : c,
                      ),
                    )
                  }
                >
                  <option value="">Choose…</option>
                  {condValues(cond.field).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="text-xs text-muted hover:text-foreground"
                type="button"
                onClick={() =>
                  setConds((list) => list.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="text-[12px] text-accent hover:underline"
            type="button"
            onClick={() =>
              setConds((list) => [
                ...list,
                { field: "status", op: "is", value: "" },
              ])
            }
          >
            + Add condition
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-muted">Then</p>
          {acts.map((act, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Action"
                className={inputClass}
                value={act.type}
                onChange={(e) =>
                  setActs((list) =>
                    list.map((a, i) =>
                      i === index ? { type: e.target.value, value: "" } : a,
                    ),
                  )
                }
              >
                {ACTION_TYPES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              {act.type === "add_comment" ? (
                <input
                  aria-label="Comment text"
                  className={`${inputClass} min-w-60 flex-1`}
                  maxLength={2000}
                  placeholder="Comment text"
                  value={act.value}
                  onChange={(e) =>
                    setActs((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, value: e.target.value } : a,
                      ),
                    )
                  }
                />
              ) : (
                <select
                  aria-label="Action value"
                  className={inputClass}
                  value={act.value}
                  onChange={(e) =>
                    setActs((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, value: e.target.value } : a,
                      ),
                    )
                  }
                >
                  {["set_assignee", "set_cycle", "set_project"].includes(
                    act.type,
                  ) ? null : (
                    <option value="">Choose…</option>
                  )}
                  {valueOptions(act.type, options).map(([value, label]) => (
                    <option key={value || "none"} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              {acts.length > 1 ? (
                <button
                  className="text-xs text-muted hover:text-foreground"
                  type="button"
                  onClick={() =>
                    setActs((list) => list.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {acts.length < 5 ? (
            <button
              className="text-[12px] text-accent hover:underline"
              type="button"
              onClick={() =>
                setActs((list) => [...list, { type: "set_status", value: "" }])
              }
            >
              + Add action
            </button>
          ) : null}
        </div>

        {error ? <p className="text-danger">{error}</p> : null}
        <button
          className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-accent-foreground disabled:opacity-50"
          disabled={pending || !name.trim()}
          type="button"
          onClick={save}
        >
          {pending ? "Saving…" : "Create automation"}
        </button>
      </section>
    </div>
  );
}
