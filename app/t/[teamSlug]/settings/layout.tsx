import { notFound } from "next/navigation";

import { SettingsNav } from "@/components/settings-nav";
import { requireTeamBySlug } from "@/lib/rbac";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const canAdmin =
    teamCtx.membership.role === "ADMIN" || teamCtx.membership.role === "OWNER";

  return (
    <div className="flex min-h-full flex-col">
      <SettingsNav canAdmin={canAdmin} teamSlug={teamSlug} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
