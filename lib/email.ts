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
