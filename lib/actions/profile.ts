"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueEmailVerification } from "@/lib/services/email-verification";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateProfileAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) return { error: "Sign in first." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user) return { error: "Sign in first." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || name.length > 100) {
    return { error: "Enter a name up to 100 characters." };
  }

  if (!emailPattern.test(email)) return { error: "Enter a valid email." };

  const emailChanged = email !== user.email;

  if (emailChanged) {
    if (
      !user.passwordHash ||
      !password ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return { error: "Enter your current password to change the email." };
    }

    const taken = await prisma.user.findUnique({ where: { email } });

    if (taken && taken.id !== user.id) {
      return { error: "That email is already in use." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      ...(emailChanged ? { email, emailVerified: null } : {}),
    },
  });

  if (emailChanged) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const origin = process.env.AUTH_URL ?? `${proto}://${host}`;

    await issueEmailVerification(email, origin);
  }

  revalidatePath("/account");

  return {
    ok: true as const,
    message: emailChanged
      ? "Email updated. Confirm the new address before the next sign-in. The previous address no longer receives invites."
      : "Name updated.",
  };
}
