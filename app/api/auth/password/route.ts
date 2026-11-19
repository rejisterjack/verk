import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { NextResponse } from "next/server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import { safeCallbackPath } from "@/lib/saml";
import { isTwoFactorEnabled } from "@/lib/services/two-factor";

/**
 * Password sign-in for a normal form post. The password stays in the request body.
 * A wrong password or a missing second factor comes back as a redirect with no secret in the URL.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const throttle = await rateLimitShared(`auth:login:${ip}`, 30, 60_000);
  const loginUrl = new URL("/login", request.url);

  if (!throttle.ok) {
    loginUrl.searchParams.set("error", "Throttle");

    return NextResponse.redirect(loginUrl, 303);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    loginUrl.searchParams.set("error", "CredentialsSignin");

    return NextResponse.redirect(loginUrl, 303);
  }
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const callbackUrl = safeCallbackPath(
    String(formData.get("callbackUrl") ?? ""),
  );

  if (!code) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (
      user?.passwordHash &&
      !user.disabled &&
      (await bcrypt.compare(password, user.passwordHash)) &&
      (await isTwoFactorEnabled(user.id))
    ) {
      loginUrl.searchParams.set("step", "code");
      loginUrl.searchParams.set("email", email);

      return NextResponse.redirect(loginUrl, 303);
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
      loginUrl.searchParams.set("error", "CredentialsSignin");
      if (code) {
        loginUrl.searchParams.set("step", "code");
        loginUrl.searchParams.set("email", email);
      }

      return NextResponse.redirect(loginUrl, 303);
    }
    throw error;
  }

  return NextResponse.redirect(new URL(callbackUrl, request.url), 303);
}
