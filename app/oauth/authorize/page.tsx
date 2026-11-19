import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { decideAuthorizationAction } from "@/lib/actions/oauth";
import { SCOPES, parseScope } from "@/lib/oauth";
import { getAuthorizeRequest } from "@/lib/services/oauth";

type Search = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Consent screen: `/oauth/authorize?response_type=code&client_id=&redirect_uri=&scope=&state=
 * &code_challenge=&code_challenge_method=S256`. A request with an unknown app or an unregistered
 * redirect URI is shown as an error and never redirected anywhere.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const clientId = one(params.client_id) ?? "";
  const redirectUri = one(params.redirect_uri) ?? "";
  const codeChallenge = one(params.code_challenge) ?? "";
  const method = one(params.code_challenge_method) ?? "";
  const state = one(params.state) ?? "";
  const scope = parseScope(one(params.scope));
  let app;

  try {
    if (one(params.response_type) !== "code")
      throw new Error("response_type must be code");
    if (!scope) throw new Error("Unknown scope");
    app = await getAuthorizeRequest({
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod: method,
    });
  } catch (error) {
    return (
      <div className="mx-auto max-w-md space-y-2 text-sm">
        <h1 className="text-xl font-semibold">Can&apos;t authorize this app</h1>
        <p className="text-muted">
          {error instanceof Error ? error.message : "The request is not valid."}
        </p>
      </div>
    );
  }
  const session = await auth();

  if (!session?.user?.id) {
    const back = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      const single = one(value);

      if (single !== undefined) back.set(key, single);
    }
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${back.toString()}`)}`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-separator bg-surface/90 p-6 text-sm shadow-xl">
      <h1 className="text-xl font-semibold">Authorize {app.name}</h1>
      <p className="text-muted">
        <strong className="text-foreground">{app.name}</strong> wants to access
        the <strong className="text-foreground">{app.team.name}</strong> team as{" "}
        <strong className="text-foreground">{session.user.email}</strong>.
      </p>
      <p className="rounded-md bg-default px-3 py-2">{SCOPES[scope!]}</p>
      <p className="text-[12px] text-muted">
        You&apos;ll be sent back to{" "}
        <span className="break-all font-mono">{redirectUri}</span>. You can
        revoke access any time from the team&apos;s OAuth settings.
      </p>
      <form action={decideAuthorizationAction} className="flex gap-2">
        <input name="client_id" type="hidden" value={clientId} />
        <input name="redirect_uri" type="hidden" value={redirectUri} />
        <input name="code_challenge" type="hidden" value={codeChallenge} />
        <input name="code_challenge_method" type="hidden" value={method} />
        <input name="scope" type="hidden" value={scope!} />
        <input name="state" type="hidden" value={state} />
        <button
          className="h-9 flex-1 rounded-md bg-accent px-3 font-medium text-accent-foreground"
          name="decision"
          type="submit"
          value="allow"
        >
          Allow
        </button>
        <button
          className="h-9 flex-1 rounded-md border border-separator px-3"
          name="decision"
          type="submit"
          value="deny"
        >
          Deny
        </button>
      </form>
    </div>
  );
}
