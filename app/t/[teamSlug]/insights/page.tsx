import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as cyclesService from "@/lib/services/cycles";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";
import {
  insightCounts,
  listSavedInsights,
  saveInsight,
} from "@/lib/services/surface";

function WeeklyBars({
  weekly,
}: {
  weekly: { label: string; created: number; done: number }[];
}) {
  const max = Math.max(
    1,
    ...weekly.flatMap((week) => [week.created, week.done]),
  );
  const height = 120;
  const barWidth = 18;
  const gap = 10;
  const groupWidth = barWidth * 2 + 6;
  const width = weekly.length * (groupWidth + gap);

  return (
    <div className="overflow-x-auto border-b border-separator px-4 py-3">
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />{" "}
          Created
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent/40" />{" "}
          Completed
        </span>
      </div>
      <svg
        aria-label="Weekly created and completed issue counts"
        className="max-w-full text-foreground"
        height={height + 28}
        role="img"
        viewBox={`0 0 ${width} ${height + 28}`}
        width={width}
      >
        {weekly.map((week, index) => {
          const x = index * (groupWidth + gap);
          const createdH = (week.created / max) * height;
          const doneH = (week.done / max) * height;

          return (
            <g key={week.label}>
              <rect
                className="fill-accent"
                height={createdH}
                rx={2}
                width={barWidth}
                x={x}
                y={height - createdH}
              />
              <rect
                className="fill-accent/40"
                height={doneH}
                rx={2}
                width={barWidth}
                x={x + barWidth + 6}
                y={height - doneH}
              />
              <text
                className="fill-muted text-[10px]"
                textAnchor="middle"
                x={x + groupWidth / 2}
                y={height + 16}
              >
                {week.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default async function InsightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const pick = (key: string) => {
    const value = query[key];

    return typeof value === "string" && value ? value : undefined;
  };
  const filter = {
    status: pick("status"),
    priority: pick("priority"),
    assigneeId: pick("assigneeId"),
    projectId: pick("projectId"),
    cycleId: pick("cycleId"),
    labelId: pick("labelId"),
    from: pick("from"),
    to: pick("to"),
    group: pick("group"),
  };
  const teamId = teamCtx.team.id;
  const [stats, members, projects, cycles, labels, saved] = await Promise.all([
    insightCounts(teamId, filter),
    membersService.listMembers(teamId),
    projectsService.listProjects(teamId),
    cyclesService.listCycles(teamId),
    labelsService.listLabels(teamId),
    listSavedInsights(teamId),
  ]);
  const cards = await Promise.all(
    saved.map(async (card) => ({
      card,
      stats: await insightCounts(
        teamId,
        (card.filterJson ?? {}) as typeof filter,
      ),
    })),
  );
  const fieldClass =
    "mt-1 block h-8 rounded-md border border-separator bg-background px-2 text-[13px] text-foreground";

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <NextLink
            className="rounded px-2 py-1 text-[12px] text-accent hover:bg-default"
            href={`/t/${teamSlug}/insights/builder`}
          >
            Open the builder →
          </NextLink>
        }
        description={`Created ${stats.created} · Completed ${stats.done}`}
        title="Insights"
      />
      <section className="border-b border-separator px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {cards.map(({ card, stats: cardStats }) => (
            <div
              key={card.id}
              className="rounded-lg border border-separator px-3 py-2 text-[13px]"
            >
              <p className="font-medium">{card.name}</p>
              <p className="text-muted">
                {cardStats.created} created · {cardStats.done} completed
                {typeof card.filterJson === "object" &&
                card.filterJson &&
                "group" in card.filterJson
                  ? ` · ${String((card.filterJson as { group?: string }).group)}`
                  : ""}
              </p>
              <ul className="mt-1 text-[12px] text-muted">
                {(String(
                  (card.filterJson as { group?: string } | null)?.group ??
                    "assignee",
                ) === "project"
                  ? cardStats.byProject.map((row) => ({
                      key: row.projectId ?? "none",
                      label:
                        projects.find((project) => project.id === row.projectId)
                          ?.name ?? "No project",
                      count: row.count,
                    }))
                  : String(
                        (card.filterJson as { group?: string } | null)?.group,
                      ) === "label"
                    ? cardStats.byLabel.map((row) => ({
                        key: row.labelId,
                        label:
                          labels.find((label) => label.id === row.labelId)
                            ?.name ?? "Label",
                        count: row.count,
                      }))
                    : cardStats.byAssignee.map((row) => ({
                        key: row.assigneeId ?? "none",
                        label:
                          members.find(
                            (member) => member.user.id === row.assigneeId,
                          )?.user.name ?? "Unassigned",
                        count: row.count,
                      }))
                ).map((row) => (
                  <li key={row.key}>
                    {row.label}: {row.count}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <form
          action={async (formData) => {
            "use server";
            await saveInsight(
              teamId,
              String(formData.get("name") ?? ""),
              filter,
            );
            redirect(`/t/${teamSlug}/insights`);
          }}
          className="mt-3 flex items-end gap-2"
        >
          <label className="text-[12px] text-muted">
            Save this filter
            <input
              required
              className="mt-1 block h-8 rounded-md border border-separator bg-background px-2 text-[13px] text-foreground"
              name="name"
            />
          </label>
          <button
            className="h-8 rounded-md border border-separator px-3 text-[12px]"
            type="submit"
          >
            Save card
          </button>
        </form>
      </section>
      <form
        className="flex flex-wrap items-end gap-2 border-b border-separator px-4 py-3"
        method="get"
      >
        <label className="text-[12px] text-muted">
          Status
          <select
            className={fieldClass}
            defaultValue={pick("status") ?? ""}
            name="status"
          >
            <option value="">Any</option>
            {["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="text-[12px] text-muted">
          Priority
          <select
            className={fieldClass}
            defaultValue={pick("priority") ?? ""}
            name="priority"
          >
            <option value="">Any</option>
            {["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"].map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-muted">
          Assignee
          <select
            className={fieldClass}
            defaultValue={pick("assigneeId") ?? ""}
            name="assigneeId"
          >
            <option value="">Any</option>
            {members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name ?? member.user.email}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-muted">
          Project
          <select
            className={fieldClass}
            defaultValue={pick("projectId") ?? ""}
            name="projectId"
          >
            <option value="">Any</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-muted">
          Cycle
          <select
            className={fieldClass}
            defaultValue={pick("cycleId") ?? ""}
            name="cycleId"
          >
            <option value="">Any</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-muted">
          Label
          <select
            className={fieldClass}
            defaultValue={pick("labelId") ?? ""}
            name="labelId"
          >
            <option value="">Any</option>
            {labels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-muted">
          Group
          <select
            className={fieldClass}
            defaultValue={pick("group") ?? "assignee"}
            name="group"
          >
            <option value="assignee">Assignee</option>
            <option value="label">Label</option>
            <option value="project">Project</option>
          </select>
        </label>
        <label className="text-[12px] text-muted">
          From
          <input
            className={fieldClass}
            defaultValue={pick("from") ?? ""}
            name="from"
            type="date"
          />
        </label>
        <label className="text-[12px] text-muted">
          To
          <input
            className={fieldClass}
            defaultValue={pick("to") ?? ""}
            name="to"
            type="date"
          />
        </label>
        <button
          className="h-8 rounded-md bg-accent px-3 text-[12px] font-medium text-accent-foreground"
          type="submit"
        >
          Apply
        </button>
      </form>
      <WeeklyBars weekly={stats.weekly} />
      <ul className="divide-y divide-separator border-b border-separator text-[13px]">
        {(pick("group") === "project"
          ? stats.byProject.map((row) => ({
              key: row.projectId ?? "none",
              label:
                projects.find((project) => project.id === row.projectId)
                  ?.name ?? "No project",
              count: row.count,
            }))
          : pick("group") === "label"
            ? stats.byLabel.map((row) => ({
                key: row.labelId,
                label:
                  labels.find((label) => label.id === row.labelId)?.name ??
                  "Label",
                count: row.count,
              }))
            : stats.byAssignee.map((row) => ({
                key: row.assigneeId ?? "none",
                label:
                  members.find((member) => member.user.id === row.assigneeId)
                    ?.user.name ?? "Unassigned",
                count: row.count,
              }))
        ).map((row) => (
          <li key={row.key} className="flex justify-between px-4 py-1.5">
            <span>{row.label}</span>
            <span className="text-muted">{row.count}</span>
          </li>
        ))}
      </ul>
      <ul className="divide-y divide-separator border-b border-separator text-[13px]">
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <li key={status} className="flex justify-between px-4 py-1.5">
            <span>
              {status
                .toLowerCase()
                .split("_")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ")}
            </span>
            <span className="text-muted">{count}</span>
          </li>
        ))}
      </ul>
      <ul className="divide-y divide-separator text-[13px]">
        {stats.cycles.map((cycle) => (
          <li key={cycle.id} className="flex justify-between px-4 py-1.5">
            <span>{cycle.name}</span>
            <span className="text-muted">{cycle.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
