import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { AskSettings } from "@/components/ask-settings";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { getAskLink } from "@/lib/services/asks";

export default async function AskSettingsPage({
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
  const link = await getAskLink(teamCtx.team.id, teamCtx.membership.role);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = process.env.AUTH_URL ?? `${proto}://${host}`;

  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="A public form anyone can use to send your team a request, with no account. Requests arrive in Triage. Admins only."
        title="Ask link"
      />
      <AskSettings
        link={
          link
            ? {
                enabled: link.enabled,
                heading: link.heading,
                prefix: link.prefix,
              }
            : null
        }
        origin={origin}
        teamSlug={teamSlug}
      />
    </div>
  );
}
