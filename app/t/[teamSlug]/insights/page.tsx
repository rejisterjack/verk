import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { insightCounts } from "@/lib/services/surface";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const stats = await insightCounts(teamCtx.team.id);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        description="Last 8 weeks"
        title="Insights"
      />
      <p className="text-sm">
        Created {stats.created} · Completed {stats.done}
      </p>
      <ul className="space-y-2 text-sm">
        {stats.cycles.map((cycle) => (
          <li key={cycle.id} className="flex justify-between">
            <span>{cycle.name}</span>
            <span>{cycle.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
