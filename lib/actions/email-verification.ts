"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueEmailVerification } from "@/lib/services/email-verification";

async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";

  return process.env.AUTH_URL ?? `${proto}://${host}`;
}

export async function resendVerificationAction() {
  const session = await auth();

  if (!session?.user?.id) return { error: "Sign in first." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });

  if (!user) return { error: "Sign in first." };
  if (user.emailVerified) return { message: "This email is already confirmed." };

  const result = await issueEmailVerification(user.email, await requestOrigin());

  return {
    message: result.mailed
      ? "Confirmation link sent."
      : "Email is not configured, so the confirmation link could not be sent.",
  };
}
