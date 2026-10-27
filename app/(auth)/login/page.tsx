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
    />
  );
}
