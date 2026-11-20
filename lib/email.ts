/* eslint-disable no-console */
import { Resend } from "resend";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildInviteContent(opts: {
  teamName: string;
  inviteUrl: string;
  inviterName?: string | null;
}) {
  const who = opts.inviterName?.trim() || "Someone";
  const subject = `Join ${opts.teamName} on Verk`;
  const text = [
    `${who} invited you to join ${opts.teamName} on Verk.`,
    "",
    `Accept the invite: ${opts.inviteUrl}`,
    "",
    "This link expires in 7 days.",
  ].join("\n");
  const html = [
    `<p>${escapeHtml(who)} invited you to join ${escapeHtml(opts.teamName)} on Verk.</p>`,
    `<p><a href="${escapeHtml(opts.inviteUrl)}">Accept the invite</a></p>`,
    "<p>This link expires in 7 days.</p>",
  ].join("");

  return { subject, text, html };
}

export async function sendInviteEmail(opts: {
  to: string;
  teamName: string;
  inviteUrl: string;
  inviterName?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const content = buildInviteContent(opts);

  if (!apiKey) {
    console.info(
      `[verk] RESEND_API_KEY absent — share invite link manually: ${opts.inviteUrl}`,
    );

    return {
      sent: false,
      error: "Email not configured — copy the invite link below",
    };
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Verk <onboarding@resend.dev>";

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    return { sent: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";

    console.info(
      `[verk] Invite email failed (${message}) — share invite link manually: ${opts.inviteUrl}`,
    );

    return {
      sent: false,
      error: `${message} — copy the invite link below`,
    };
  }
}

export async function sendVerificationEmail(opts: {
  to: string;
  verifyUrl: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return { sent: false };

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Verk <onboarding@resend.dev>";

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject: "Confirm your Verk email",
      text: `Confirm this address: ${opts.verifyUrl}\n\nThis link expires in 24 hours.`,
      html: `<p><a href="${escapeHtml(opts.verifyUrl)}">Confirm this address</a></p><p>This link expires in 24 hours.</p>`,
    });

    return { sent: true };
  } catch {
    return { sent: false };
  }
}

export async function sendInboxEmail(opts: {
  to: string;
  title: string;
  body: string;
  url: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return { sent: false };

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Verk <onboarding@resend.dev>";
  const subject = opts.title.slice(0, 180);

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject,
      text: [opts.title, opts.body, opts.url].filter(Boolean).join("\n\n"),
      html: `<p>${escapeHtml(opts.title)}</p>${opts.body ? `<p>${escapeHtml(opts.body)}</p>` : ""}<p><a href="${escapeHtml(opts.url)}">Open in Verk</a></p>`,
    });

    return { sent: true };
  } catch {
    return { sent: false };
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return { sent: false };

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Verk <onboarding@resend.dev>";

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject: "Reset your Verk password",
      text: `Set a new password: ${opts.resetUrl}\n\nThis link expires in 30 minutes and works once.`,
      html: `<p><a href="${escapeHtml(opts.resetUrl)}">Set a new password</a></p><p>This link expires in 30 minutes and works once.</p>`,
    });

    return { sent: true };
  } catch {
    return { sent: false };
  }
}
