/**
 * Where the installed app's shortcuts and "Share to Verk" land. One entry route (`/t/go`) picks
 * the person's team and turns the request into an in-app path, so the manifest stays static.
 */

export type GoTarget = "new" | "mine" | "inbox";

export function parseGoTarget(value: unknown): GoTarget | null {
  return value === "new" || value === "mine" || value === "inbox"
    ? value
    : null;
}

const MAX_TITLE = 160;
const MAX_BODY = 4000;

/** Turn what another app shared (title, text, url) into a draft title and description. */
export function sharedToDraft(input: {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}): { title: string; description: string } {
  const clean = (value: string | null | undefined) =>
    (value ?? "")

      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim();
  const title = clean(input.title);
  const text = clean(input.text);
  const url = clean(input.url);
  // Some apps put the link inside `text` instead of `url`.
  const link = url || text.match(/https?:\/\/\S+/)?.[0] || "";
  const firstLine = text.split("\n")[0] ?? "";
  const heading = (title || firstLine || link).slice(0, MAX_TITLE);
  const parts = [
    text && text !== heading ? text : "",
    // The link is already the title when nothing else was shared.
    link && !text.includes(link) && link !== heading ? link : "",
  ].filter(Boolean);

  return { title: heading, description: parts.join("\n\n").slice(0, MAX_BODY) };
}

/** The in-app path for a target, given the team slug. Shared content is carried in the query. */
export function pathFor(
  teamSlug: string,
  target: GoTarget | null,
  shared?: { title: string; description: string },
): string {
  const base = `/t/${teamSlug}`;

  if (shared && (shared.title || shared.description)) {
    const params = new URLSearchParams({ new: "1" });

    if (shared.title) params.set("title", shared.title);
    if (shared.description) params.set("description", shared.description);

    return `${base}/issues?${params}`;
  }
  switch (target) {
    case "new":
      return `${base}/issues?new=1`;
    case "mine":
      return `${base}/issues?assignee=me`;
    case "inbox":
      return `${base}/inbox`;
    default:
      return `${base}/issues`;
  }
}
