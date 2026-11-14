/**
 * Validation for public "ask" submissions. Everything here is untrusted text from the open
 * internet, so it is trimmed, length-limited and cleaned of control characters, and a hidden
 * "honeypot" field catches simple bots. Pure, so it is easy to test.
 */

export const LIMITS = {
  title: 140,
  details: 4000,
  name: 80,
  email: 120,
} as const;

export type AskInput = {
  title: string;
  details: string;
  name: string;
  email: string;
};

export type AskResult =
  | { ok: true; value: AskInput }
  /** `spam` means the honeypot was filled: answer as if it worked, but store nothing. */
  | { ok: false; reason: "spam" }
  | { ok: false; reason: "invalid"; message: string };

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";

  return value
    .replace(CONTROL, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

export function isEmail(value: string): boolean {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= LIMITS.email
  );
}

/** Links are fine in a request, but a wall of them is nearly always spam. */
export function tooManyLinks(text: string, max = 3): boolean {
  return (text.match(/https?:\/\//gi) ?? []).length > max;
}

export function validateAsk(raw: Record<string, unknown>): AskResult {
  // The honeypot input is hidden from people; only a bot fills it.
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return { ok: false, reason: "spam" };
  }
  const title = clean(raw.title, LIMITS.title);
  const details = clean(raw.details, LIMITS.details);
  const name = clean(raw.name, LIMITS.name);
  const email = clean(raw.email, LIMITS.email).toLowerCase();

  if (!title)
    return {
      ok: false,
      reason: "invalid",
      message: "Please add a short title.",
    };
  if (title.length < 4) {
    return { ok: false, reason: "invalid", message: "The title is too short." };
  }
  if (email && !isEmail(email)) {
    return {
      ok: false,
      reason: "invalid",
      message: "That email address does not look right.",
    };
  }
  if (tooManyLinks(`${title}\n${details}`)) {
    return {
      ok: false,
      reason: "invalid",
      message: "Please include fewer links.",
    };
  }

  return { ok: true, value: { title, details, name, email } };
}

/** The issue description a team member sees, with who asked and how to reach them. */
export function describeAsk(input: AskInput): string {
  const from = [input.name, input.email ? `<${input.email}>` : ""]
    .filter(Boolean)
    .join(" ");

  return [
    input.details || "(no details)",
    "",
    `— Submitted through the public ask link${from ? ` by ${from}` : ""}.`,
  ].join("\n");
}
