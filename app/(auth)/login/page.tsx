import { LoginForm } from "@/components/auth-form";
import { isDemoMode } from "@/lib/utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const demo = isDemoMode();

  return (
    <LoginForm
      callbackUrl={params.callbackUrl ?? "/onboarding"}
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
    />
  );
}
