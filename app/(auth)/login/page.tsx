import { LoginForm } from "@/components/auth-form";
import { isPrivateHost } from "@/lib/auth-allowlist";
import { isSamlEnabled } from "@/lib/saml";
import { isDemoMode } from "@/lib/utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    email?: string;
    error?: string;
    step?: string;
  }>;
}) {
  const params = await searchParams;
  const demo = isDemoMode();

  return (
    <LoginForm
      accessDenied={params.error === "AccessDenied"}
      askForCode={params.step === "code"}
      callbackUrl={params.callbackUrl ?? "/onboarding"}
      credentialsError={params.error === "CredentialsSignin"}
      throttled={params.error === "Throttle"}
      initialEmail={params.email ?? ""}
      demoMode={demo}
      githubEnabled={Boolean(
        process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
      )}
      googleEnabled={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
      oidcEnabled={Boolean(
        process.env.AUTH_OIDC_ISSUER && process.env.AUTH_OIDC_CLIENT_ID,
      )}
      privateHost={isPrivateHost()}
      samlEnabled={isSamlEnabled()}
      samlError={params.error?.startsWith("Saml") ? params.error : undefined}
    />
  );
}
