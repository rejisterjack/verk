import { notFound } from "next/navigation";

import { AutomationsSettings } from "@/components/automations-settings";
import { ViewToolbar } from "@/components/page-header";
import {
  describeAction,
  parseActions,
  parseConditions,
  TRIGGERS,
} from "@/lib/automations";
import { describeFilter } from "@/lib/issue-filter-edit";
import { requireTeamBySlug } from "@/lib/rbac";
import { listAutomations } from "@/lib/services/automations";
import * as cyclesService from "@/lib/services/cycles";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";

export default async function AutomationsSettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "ADMIN");
  } catch {
    notFound();
  }
  const teamId = teamCtx.team.id;
  const [rules, members, labels, cycles, projects] = await Promise.all([
    listAutomations(teamId),
    membersService.listMembers(teamId),
    labelsService.listLabels(teamId),
    cyclesService.listCycles(teamId),
    projectsService.listProjects(teamId),
  ]);
  const names = {
    users: new Map(
      members.map((m) => [m.user.id, m.user.name ?? m.user.email]),
    ),
    labels: new Map(labels.map((l) => [l.id, l.name])),
  };

  return (
    <div className="max-w-3xl px-4 py-3">
      <ViewToolbar
        description="When something happens to an issue and it matches your conditions, apply actions automatically. Automations never trigger other automations. Admins only."
        title="Automations"
      />
      <AutomationsSettings
        automations={rules.map((rule) => {
          let when = "any issue";

          try {
            const conditions = parseConditions(rule.conditions);

            if (conditions) when = describeFilter(conditions);
          } catch {
            when = "(conditions could not be read)";
          }
          const trigger =
            TRIGGERS.find((t) => t.id === rule.trigger)?.label ?? rule.trigger;
          const actions = parseActions(rule.actions)
            .map((action) => describeAction(action, names))
            .join(", ");

          return {
            id: rule.id,
            name: rule.name,
            enabled: rule.enabled,
            trigger: rule.trigger,
            summary: `${trigger}. If ${when}: ${actions || "no valid actions"}.`,
            runCount: rule.runCount,
            lastRunAt: rule.lastRunAt?.toISOString() ?? null,
          };
        })}
        options={{
          members: members.map((m) => m.user),
          labels: labels.map((l) => ({ id: l.id, name: l.name })),
          cycles: cycles.map((c) => ({ id: c.id, name: c.name })),
          projects: projects.map((p) => ({ id: p.id, name: p.name })),
        }}
        teamSlug={teamSlug}
      />
    </div>
  );
}
