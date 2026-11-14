"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { saveFilterViewAction } from "@/lib/actions/views";
import {
  FILTER_SPEC,
  type Condition,
  type Filter,
  type FilterField,
  type FilterOp,
  type FilterValue,
  isGroup,
  MAX_FILTER_CONDITIONS,
} from "@/lib/issue-filter";
import {
  addCondition,
  addGroup,
  BUILDER_FIELDS,
  cleanFilter,
  countConditions,
  describeFilter,
  EMPTY_FILTER,
  isDateOp,
  isDayCountOp,
  isMultiOp,
  isNoValueOp,
  type Path,
  removeNode,
  toggleGroupOp,
  updateNode,
  withField,
  withOp,
} from "@/lib/issue-filter-edit";

type Named = { id: string; name: string };
export type FilterOptions = {
  members: { id: string; name: string | null; email: string }[];
  projects: Named[];
  cycles: Named[];
  milestones: Named[];
  workflows: Named[];
  labels: { id: string; name: string; color?: string }[];
};

const OP_LABELS: Record<FilterOp, string> = {
  is: "is",
  is_not: "is not",
  in: "is any of",
  not_in: "is none of",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  includes_any: "includes any of",
  includes_all: "includes all of",
  includes_none: "includes none of",
  contains: "contains",
  not_contains: "does not contain",
  gt: "is greater than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  before: "is before",
  after: "is after",
  on: "is on",
  within_last: "in the last",
  within_next: "in the next",
  older_than: "is older than",
};

const ENUM_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
  NONE: "None",
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const controlClass =
  "h-7 rounded-md border border-separator bg-surface px-2 text-[12px] text-foreground";

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function ValueEditor({
  condition,
  options,
  onChange,
}: {
  condition: Condition;
  options: FilterOptions;
  onChange: (value: FilterValue) => void;
}) {
  const { field, op } = condition;
  const spec = FILTER_SPEC[field];
  const value = condition.value;
  const label = `${spec.label} value`;

  if (isNoValueOp(op)) return null;

  if (isDayCountOp(op)) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-muted">
        <input
          aria-label="Number of days"
          className={`${controlClass} w-16`}
          max={3650}
          min={1}
          type="number"
          value={typeof value === "number" ? value : 7}
          onChange={(e) => onChange(Number(e.target.value) || 1)}
        />
        days
      </span>
    );
  }
  if (isDateOp(op)) {
    return (
      <input
        aria-label={label}
        className={controlClass}
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // Lists of ids or enums: a row of toggle chips.
  if (isMultiOp(op)) {
    const chosen = Array.isArray(value) ? value : [];
    const choices: { id: string; label: string }[] =
      spec.kind === "labels"
        ? options.labels.map((l) => ({ id: l.id, label: l.name }))
        : spec.kind === "enum"
          ? (spec.options ?? []).map((o) => ({
              id: o,
              label: ENUM_LABELS[o] ?? o,
            }))
          : spec.kind === "person"
            ? [
                { id: "me", label: "Me" },
                ...options.members.map((m) => ({
                  id: m.id,
                  label: m.name ?? m.email,
                })),
              ]
            : optionsFor(field, options);

    return (
      <span
        aria-label={label}
        className="inline-flex flex-wrap gap-1"
        role="group"
      >
        {choices.map((choice) => {
          const on = chosen.includes(choice.id);

          return (
            <button
              key={choice.id}
              aria-pressed={on}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                on
                  ? "border-accent bg-accent/10"
                  : "border-separator text-muted"
              }`}
              type="button"
              onClick={() => onChange(toggleIn(chosen, choice.id))}
            >
              {choice.label}
            </button>
          );
        })}
        {choices.length === 0 ? (
          <span className="text-[11px] text-muted">Nothing to choose from</span>
        ) : null}
      </span>
    );
  }

  switch (spec.kind) {
    case "enum":
      return (
        <select
          aria-label={label}
          className={controlClass}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {(spec.options ?? []).map((o) => (
            <option key={o} value={o}>
              {ENUM_LABELS[o] ?? o}
            </option>
          ))}
        </select>
      );
    case "person":
      return (
        <select
          aria-label={label}
          className={controlClass}
          value={String(value ?? "me")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="me">Me</option>
          {options.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.email}
            </option>
          ))}
        </select>
      );
    case "ref": {
      const choices = optionsFor(field, options);

      return (
        <select
          aria-label={label}
          className={controlClass}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose…</option>
          {field === "cycle" ? (
            <option value="active">Active cycle</option>
          ) : null}
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      );
    }
    case "number":
      return (
        <input
          aria-label={label}
          className={`${controlClass} w-20`}
          min={0}
          type="number"
          value={typeof value === "number" ? value : 0}
          onChange={(e) =>
            onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))
          }
        />
      );
    case "bool":
      return (
        <select
          aria-label={label}
          className={controlClass}
          value={value === false ? "no" : "yes"}
          onChange={(e) => onChange(e.target.value === "yes")}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      );
    default:
      return (
        <input
          aria-label={label}
          className={`${controlClass} w-40`}
          maxLength={200}
          placeholder={field === "label_group" ? "Group name" : "Text"}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function optionsFor(field: FilterField, options: FilterOptions) {
  const list: Named[] =
    field === "project"
      ? options.projects
      : field === "cycle"
        ? options.cycles
        : field === "milestone"
          ? options.milestones
          : field === "workflow_status"
            ? options.workflows
            : [];

  return list.map((item) => ({ id: item.id, label: item.name }));
}

function Node({
  node,
  path,
  root,
  options,
  onChange,
}: {
  node: Filter;
  path: Path;
  root: Filter;
  options: FilterOptions;
  onChange: (next: Filter) => void;
}) {
  if (isGroup(node)) {
    const isRoot = path.length === 0;

    return (
      <div
        className={
          isRoot
            ? "space-y-2"
            : "space-y-2 rounded-md border border-separator p-2"
        }
      >
        {node.rules.length > 1 || !isRoot ? (
          <div className="flex items-center gap-2 text-[12px] text-muted">
            Match
            <button
              aria-label={`Match ${node.op === "and" ? "all" : "any"} of these. Click to switch`}
              className="rounded border border-separator px-2 py-0.5 font-medium text-foreground"
              type="button"
              onClick={() => onChange(toggleGroupOp(root, path))}
            >
              {node.op === "and" ? "all" : "any"}
            </button>
            of the following
            {isRoot ? null : (
              <button
                aria-label="Remove group"
                className="ml-auto text-muted hover:text-danger"
                type="button"
                onClick={() => onChange(removeNode(root, path))}
              >
                Remove group
              </button>
            )}
          </div>
        ) : null}
        {node.rules.map((rule, index) => (
          <Node
            key={index}
            node={rule}
            options={options}
            path={[...path, index]}
            root={root}
            onChange={onChange}
          />
        ))}
        <div className="flex gap-3 text-[12px]">
          <button
            className="text-accent hover:underline disabled:opacity-40"
            disabled={countConditions(root) >= MAX_FILTER_CONDITIONS}
            type="button"
            onClick={() => onChange(addCondition(root, path))}
          >
            + Add filter
          </button>
          <button
            className="text-muted hover:text-foreground"
            type="button"
            onClick={() => onChange(addGroup(root, path))}
          >
            + Add group
          </button>
        </div>
      </div>
    );
  }

  const spec = FILTER_SPEC[node.field];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        aria-label="Field"
        className={controlClass}
        value={node.field}
        onChange={(e) =>
          onChange(
            updateNode(
              root,
              path,
              withField(node, e.target.value as FilterField),
            ),
          )
        }
      >
        {BUILDER_FIELDS.map((f) => (
          <option key={f} value={f}>
            {FILTER_SPEC[f].label}
          </option>
        ))}
      </select>
      <select
        aria-label="Condition"
        className={controlClass}
        value={node.op}
        onChange={(e) =>
          onChange(
            updateNode(root, path, withOp(node, e.target.value as FilterOp)),
          )
        }
      >
        {spec.ops.map((op) => (
          <option key={op} value={op}>
            {OP_LABELS[op]}
          </option>
        ))}
      </select>
      <ValueEditor
        condition={node}
        options={options}
        onChange={(value) =>
          onChange(updateNode(root, path, { ...node, value } as Condition))
        }
      />
      <button
        aria-label="Remove filter"
        className="ml-auto text-[12px] text-muted hover:text-danger"
        type="button"
        onClick={() => onChange(removeNode(root, path))}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Advanced filter editor for the issues page. "Apply" puts the filter in the URL
 * (`?filter=<json>`), so it can be shared and bookmarked; "Save as view" stores it.
 */
export function FilterBuilder({
  teamSlug,
  initial,
  options,
  canSave,
  error,
}: {
  teamSlug: string;
  initial: Filter | null;
  options: FilterOptions;
  canSave: boolean;
  error?: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(Boolean(error));
  const [draft, setDraft] = useState<Filter>(initial ?? EMPTY_FILTER);
  const [viewName, setViewName] = useState("");
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [pending, setPending] = useState(false);
  const active = cleanFilter(initial ?? EMPTY_FILTER);
  const count = active ? countConditions(active) : 0;

  function go(next: Filter | null) {
    const query = new URLSearchParams(params.toString());

    query.delete("view");
    if (next) query.set("filter", JSON.stringify(next));
    else query.delete("filter");
    const qs = query.toString();

    router.push(`/t/${teamSlug}/issues${qs ? `?${qs}` : ""}`);
  }

  function apply() {
    const cleaned = cleanFilter(draft);

    setMessage(null);
    go(cleaned);
    setOpen(false);
  }

  async function saveView() {
    const cleaned = cleanFilter(draft);

    if (!cleaned) {
      setMessage("Add at least one filter first");

      return;
    }
    setPending(true);
    setMessage(null);
    const result = await saveFilterViewAction(teamSlug, {
      name: viewName,
      filter: cleaned,
      layout: params.get("layout") === "board" ? "BOARD" : "LIST",
    });

    setPending(false);
    if ("error" in result && result.error) {
      setMessage(result.error);

      return;
    }
    setViewName("");
    setMessage("View saved");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className={`h-7 rounded-md border px-2.5 text-[12px] ${
          count ? "border-accent text-accent" : "border-separator text-muted"
        } hover:text-foreground`}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        Filters{count ? ` · ${count}` : ""}
      </button>
      {open ? (
        <div
          aria-label="Filter builder"
          className="absolute left-0 top-full z-30 mt-1 w-[min(44rem,92vw)] space-y-3 rounded-lg border border-separator bg-surface p-3 shadow-lg"
          role="dialog"
        >
          <Node
            node={draft}
            options={options}
            path={[]}
            root={draft}
            onChange={setDraft}
          />
          {draft && countConditions(draft) === 0 ? (
            <p className="text-[12px] text-muted">
              No filters yet. Add one to narrow the list.
            </p>
          ) : (
            <p className="text-[12px] text-muted">
              {describeFilter(cleanFilter(draft))}
            </p>
          )}
          {message ? (
            <p className="text-[12px] text-danger" role="status">
              {message}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 border-t border-separator pt-3">
            <button
              className="h-7 rounded-md bg-accent px-3 text-[12px] font-medium text-accent-foreground"
              type="button"
              onClick={apply}
            >
              Apply
            </button>
            <button
              className="h-7 rounded-md border border-separator px-3 text-[12px] text-muted hover:text-foreground"
              type="button"
              onClick={() => {
                setDraft(EMPTY_FILTER);
                go(null);
                setOpen(false);
              }}
            >
              Clear
            </button>
            {canSave ? (
              <span className="ml-auto flex items-center gap-1">
                <input
                  aria-label="View name"
                  className={`${controlClass} w-36`}
                  maxLength={80}
                  placeholder="Save as view…"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                />
                <button
                  className="h-7 rounded-md border border-separator px-2 text-[12px] hover:bg-default disabled:opacity-40"
                  disabled={pending || !viewName.trim()}
                  type="button"
                  onClick={() => void saveView()}
                >
                  Save
                </button>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
