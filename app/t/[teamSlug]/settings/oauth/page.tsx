import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { OAuthSettings } from "@/components/oauth-settings";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import { listOAuthApps } from "@/lib/services/oauth";

export default async function OAuthSettingsPage({
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
  const apps = await listOAuthApps(teamCtx.team.id, teamCtx.membership.role);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = process.env.AUTH_URL ?? `${proto}://${host}`;

  return (
    <div className="max-w-3xl px-4 py-3">
      <ViewToolbar
        description="Let other apps sign in with Verk. They use the authorization-code flow with PKCE, and every token can be revoked here. Admins only."
        title="OAuth apps"
      />
      <OAuthSettings
        apps={apps.map((app) => ({
          id: app.id,
          name: app.name,
          clientId: app.clientId,
          redirectUris: app.redirectUris,
          confidential: Boolean(app.clientSecretHash),
        }))}
        origin={origin}
        teamSlug={teamSlug}
      />
    </div>
  );
}
