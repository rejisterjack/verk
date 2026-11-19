import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth-form";
import { isPrivateHost } from "@/lib/auth-allowlist";
import { isDemoMode } from "@/lib/utils";

export default function RegisterPage() {
  if (isDemoMode() || isPrivateHost()) {
    redirect("/login");
  }

  return (
    <RegisterForm
      githubEnabled={Boolean(
        process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
      )}
    />
  );
}
