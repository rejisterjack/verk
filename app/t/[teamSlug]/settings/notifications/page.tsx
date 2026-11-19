import { NotificationSettings } from "@/components/notification-settings";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { getMutedTypes } from "@/lib/services/notifications";

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  const { user } = await requireTeamBySlug(teamSlug);
  const muted = await getMutedTypes(user.id!);

  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="Choose what lands in your inbox. Muted types are not created at all, on any team; mark-all-read still works on what you already have."
        title="Notifications"
      />
      <NotificationSettings initialMuted={muted} teamSlug={teamSlug} />
    </div>
  );
}
