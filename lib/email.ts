/* eslint-disable no-console */
import { Resend } from "resend";

export async function sendInviteEmail(opts: {
  to: string;
  teamName: string;
  inviteUrl: string;
  inviterName?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

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
      subject: `Join ${opts.teamName} on Verk`,
      text: [
        `${opts.inviterName ?? "Someone"} invited you to join ${opts.teamName} on Verk.`,
        "",
        `Accept the invite: ${opts.inviteUrl}`,
        "",
        "This link expires in 7 days.",
      ].join("\n"),
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
