import { LoginForm } from "@/components/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <LoginForm
      callbackUrl={params.callbackUrl ?? "/onboarding"}
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
