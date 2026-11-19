import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { validateAsk, LIMITS } from "@/lib/asks";
import { rateLimitShared } from "@/lib/rate-limit";
import { findTeamByAskToken, submitAsk } from "@/lib/services/asks";

export const metadata = {
  title: "Ask the team",
  robots: { index: false, follow: false },
};

const field =
  "mt-1 block w-full rounded-md border border-separator bg-background px-3 py-2 text-sm text-foreground";

/**
 * A public page for sending a request to a team. No account needed. A wrong or switched-off
 * token is a plain 404, so the page does not reveal whether a team exists.
 */
export default async function AskPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const found = await findTeamByAskToken(token);

  if (!found) notFound();
  const { team, heading } = found;

  async function send(formData: FormData) {
    "use server";
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    // Per visitor and per team, so one noisy link can't flood a team's triage queue.
    const perIp = await rateLimitShared(`ask:ip:${ip}`, 5, 10 * 60_000);
    const perTeam = await rateLimitShared(
      `ask:team:${team.id}`,
      60,
      60 * 60_000,
    );

    if (!perIp.ok || !perTeam.ok) {
      redirect(
        `/ask/${token}?error=${encodeURIComponent("Too many requests. Please try again later.")}`,
      );
    }
    const result = validateAsk(Object.fromEntries(formData));

    if (!result.ok) {
      // A bot gets the same "sent" page as a person, and nothing is stored.
      if (result.reason === "spam") redirect(`/ask/${token}?sent=1`);
      redirect(`/ask/${token}?error=${encodeURIComponent(result.message)}`);
    }
    await submitAsk(team.id, result.value);
    redirect(`/ask/${token}?sent=1`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">
        {heading || `Ask ${team.name}`}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Send a request or report a problem. The team will see it in their queue.
      </p>
      {query.sent ? (
        <p className="mt-6 rounded-lg border border-separator bg-surface/60 p-4 text-sm">
          Thank you. Your request was sent.
        </p>
      ) : (
        <form action={send} className="mt-6 space-y-4 text-sm">
          {query.error ? <p className="text-danger">{query.error}</p> : null}
          <label className="block">
            Title
            <input
              required
              className={field}
              maxLength={LIMITS.title}
              minLength={4}
              name="title"
            />
          </label>
          <label className="block">
            Details
            <textarea
              className={field}
              maxLength={LIMITS.details}
              name="details"
              rows={6}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              Your name (optional)
              <input className={field} maxLength={LIMITS.name} name="name" />
            </label>
            <label className="block">
              Your email (optional)
              <input
                className={field}
                maxLength={LIMITS.email}
                name="email"
                type="email"
              />
            </label>
          </div>
          {/* Honeypot: hidden from people and from assistive tech; only bots fill it. */}
          <div
            aria-hidden
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          >
            <label>
              Website
              <input autoComplete="off" name="website" tabIndex={-1} />
            </label>
          </div>
          <button
            className="h-10 rounded-md bg-accent px-4 font-medium text-accent-foreground"
            type="submit"
          >
            Send
          </button>
        </form>
      )}
    </main>
  );
}
