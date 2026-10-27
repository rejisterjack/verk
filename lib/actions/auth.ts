"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

async function authThrottle(action: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  return rateLimit(`auth:${action}:${ip}`, 30, 60_000);
}

export async function registerAction(formData: FormData) {
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
  const callbackUrl = String(formData.get("callbackUrl") ?? "/onboarding");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
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
