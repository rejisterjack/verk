import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { WEBHOOK_EVENTS } from "@/lib/services/webhooks";

const GROUPS = [
  "issues",
  "comments",
  "cycles",
  "projects",
  "labels",
  "members",
  "views",
  "webhooks",
];

export default async function ApiSettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;

  try {
    await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="REST groups live under /api/teams. Webhooks you create can subscribe to these events."
        title="API"
      />
      <h2 className="mt-4 text-sm font-semibold">REST</h2>
      <ul className="mt-2 space-y-1 text-[13px] text-muted">
        {GROUPS.map((group) => (
          <li key={group}>/api/teams/[teamId]/{group}</li>
        ))}
      </ul>
      <h2 className="mt-6 text-sm font-semibold">Issue agent</h2>
      <p className="mt-2 text-[13px] text-muted">
        POST /api/agent with Authorization: Bearer verk_… and JSON teamId plus
        prompt. Requires AI_API_KEY. This files and updates issues only. Use MCP
        at /api/mcp when the agent needs the full tool list. Prompts that ask to
        open or merge a pull request are refused.
      </p>
      <h2 className="mt-6 text-sm font-semibold">Webhook events</h2>
      <ul className="mt-2 space-y-1 text-[13px] text-muted">
        {WEBHOOK_EVENTS.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ul>
    </div>
  );
}
