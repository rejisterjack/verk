"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";

import { isPrivateHost } from "@/lib/auth-allowlist";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import { isTwoFactorEnabled } from "@/lib/services/two-factor";
import { isDemoMode } from "@/lib/utils";
import { registerSchema } from "@/lib/validators";

async function authThrottle(action: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  return rateLimitShared(`auth:${action}:${ip}`, 30, 60_000);
}

export async function registerAction(formData: FormData) {
  if (isDemoMode()) {
    return {
      error: "Registration is disabled on the public demo. Use demo@verk.dev.",
    };
  }

  if (isPrivateHost()) {
    return {
      error: "This host is private. Deploy your own Verk to create an account.",
    };
  }

  const throttle = await authThrottle("register");

  if (!throttle.ok) {
    return { error: "Too many attempts. Try again shortly." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid registration details" };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created but sign-in failed. Try logging in." };
    }
    throw error;
  }
}

export async function loginAction(formData: FormData) {
  const throttle = await authThrottle("login");

  if (!throttle.ok) {
    return { error: "Too many attempts. Try again shortly." };
  }

  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const callbackUrl = String(formData.get("callbackUrl") ?? "/onboarding");

  // Ask for the second factor only after the password is right, so a wrong password never
  // reveals whether an account has 2FA.
  if (!code) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (
      user?.passwordHash &&
      !user.disabled &&
      (await bcrypt.compare(password, user.passwordHash)) &&
      (await isTwoFactorEnabled(user.id))
    ) {
      return { needsCode: true as const };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      code,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: code
          ? "Invalid code, or too many attempts. Try again in a few minutes."
          : "Invalid email or password",
        ...(code ? { needsCode: true as const } : {}),
      };
    }
    throw error;
  }
}

/** Finish a passkey sign-in: the browser's signed assertion is checked inside the provider. */
export async function passkeySignInAction(
  assertion: string,
  callbackUrl = "/onboarding",
) {
  const throttle = await authThrottle("passkey");

  if (!throttle.ok) return { error: "Too many attempts. Try again shortly." };

  try {
    await signIn("passkey", { assertion, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "That passkey could not be verified. Try again." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function githubSignInAction(formData?: FormData) {
  const callbackUrl = String(formData?.get("callbackUrl") ?? "/onboarding");

  await signIn("github", { redirectTo: callbackUrl });
}

export async function googleSignInAction(formData?: FormData) {
  const callbackUrl = String(formData?.get("callbackUrl") ?? "/onboarding");

  await signIn("google", { redirectTo: callbackUrl });
}

export async function oidcSignInAction(formData?: FormData) {
  const callbackUrl = String(formData?.get("callbackUrl") ?? "/onboarding");

  await signIn("oidc", { redirectTo: callbackUrl });
}
