"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { parseScope, redirectWith } from "@/lib/oauth";
import { requireTeamBySlug } from "@/lib/rbac";
import * as oauth from "@/lib/services/oauth";

/** The consent screen's Allow / Deny. Only a signed-in user can reach the code issuing step. */
export async function decideAuthorizationAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const state = String(formData.get("state") ?? "") || undefined;
  const scope = parseScope(String(formData.get("scope") ?? "read"));
  // The request is checked again here: the form is user-editable, so it is never trusted.
  const app = await oauth.getAuthorizeRequest({
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod: String(formData.get("code_challenge_method") ?? ""),
  });

  if (formData.get("decision") !== "allow" || !scope) {
    redirect(redirectWith(redirectUri, { error: "access_denied", state }));
  }
  const code = await oauth.issueCode({
    appId: app.id,
    userId: session.user.id,
    redirectUri,
    codeChallenge,
    scope: scope!,
  });

  redirect(redirectWith(redirectUri, { code, state }));
}

export async function createOAuthAppAction(
  teamSlug: string,
  input: { name: string; redirectUris: string; confidential: boolean },
) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    const result = await oauth.createOAuthApp(
      team.id,
      user.id!,
      {
        name: input.name,
        redirectUris: input.redirectUris.split(/\s+/),
        confidential: input.confidential,
      },
      membership.role,
      { id: user.id!, name: user.name, email: user.email },
    );

    revalidatePath(`/t/${teamSlug}/settings/oauth`);

    return {
      ok: true as const,
      clientId: result.app.clientId,
      clientSecret: result.clientSecret,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not register the app",
    };
  }
}

export async function deleteOAuthAppAction(teamSlug: string, appId: string) {
  const { team, membership, user } = await requireTeamBySlug(teamSlug, "ADMIN");

  try {
    await oauth.deleteOAuthApp(team.id, appId, membership.role, {
      id: user.id!,
      name: user.name,
      email: user.email,
    });
    revalidatePath(`/t/${teamSlug}/settings/oauth`);

    return { ok: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not delete",
    };
  }
}
