"use server";

import { headers } from "next/headers";

import { isDemoMode } from "@/lib/utils";
import { rateLimitShared } from "@/lib/rate-limit";
import {
  completePasswordReset,
  requestPasswordReset,
} from "@/lib/services/password-reset";
import {
  passwordResetRequestSchema,
  passwordResetSchema,
} from "@/lib/validators";

async function clientIp() {
  const h = await headers();

  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function requestPasswordResetAction(formData: FormData) {
  if (isDemoMode()) {
    return {
      error:
        "Password reset is disabled on the public demo. Use demo@verk.dev.",
    };
  }

  const throttle = await rateLimitShared(
    `auth:reset:${await clientIp()}`,
    10,
    60_000,
  );

  if (!throttle.ok) {
    return { error: "Too many attempts. Try again shortly." };
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) return { error: "Enter a valid email address" };

  const origin = (await headers()).get("origin") || "http://localhost:3000";
  const result = await requestPasswordReset(
    parsed.data.email.toLowerCase(),
    origin,
  );

  if (!result.mailed) {
    return {
      error:
        "We could not send email right now. Try again once email is configured.",
    };
  }

  return {
    message: "If an account exists for that address, we sent a reset link.",
  };
}

export async function completePasswordResetAction(formData: FormData) {
  const throttle = await rateLimitShared(
    `auth:reset-complete:${await clientIp()}`,
    10,
    60_000,
  );

  if (!throttle.ok) {
    return { error: "Too many attempts. Try again shortly." };
  }

  const parsed = passwordResetSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success)
    return { error: "Use a password of 8 to 128 characters" };

  const token = String(formData.get("token") ?? "");

  if (!token) return { error: "This reset link is invalid or expired." };

  return completePasswordReset(token, parsed.data.password);
}
