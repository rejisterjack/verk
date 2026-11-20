import { SetPasswordForm } from "@/components/password-reset-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <SetPasswordForm token={token} />;
}
