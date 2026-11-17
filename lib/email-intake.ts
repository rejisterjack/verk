/**
 * Turn an inbound email (as posted by a mail provider's webhook) into a request for the team's
 * triage queue. Pure: the route does auth and the database work.
 *
 * The provider does the SMTP and sends us JSON (Postmark, Resend, SendGrid, Mailgun and others all
 * can). We accept a small, provider-neutral shape and normalise the common field names, so a
 * team can point any of them at `POST /api/teams/{id}/email`.
 *
 * Safety rules, because anyone on the internet can send an email:
 *  - The route requires a shared secret; this file never trusts the sender address by itself.
 *  - Automated mail (auto-replies, bounces, mailing lists) is dropped, so two robots cannot
 *    start a loop that fills the backlog.
 *  - Quoted replies and signatures are cut, so a long thread does not become a wall of text.
 *  - Nothing in the email is ever treated as markup or a command; it is plain text.
 */

export const MAX_TITLE = 160;
export const MAX_BODY = 8000;
export const MAX_SENDER = 200;

export type InboundEmail = {
  from: string;
  fromName: string;
  subject: string;
  text: string;
  messageId: string;
  headers: Record<string, string>;
};

export type EmailParse =
  | { ok: true; email: InboundEmail }
  | { ok: false; reason: "invalid" | "no_sender" | "empty" };

function pickString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];

    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

/** `"Ada Lovelace" <ada@example.com>` or `ada@example.com` into name and address. */
export function parseAddress(value: string): { name: string; address: string } {
  const text = value.trim();
  const angle = text.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);

  if (angle) {
    return {
      name: angle[1]!.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, MAX_SENDER),
      address: angle[2]!.toLowerCase(),
    };
  }
  const bare = text.match(/^[^\s<>@]+@[^\s<>@]+$/);

  return { name: "", address: bare ? text.toLowerCase() : "" };
}

function normaliseHeaders(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};

  if (Array.isArray(value)) {
    // Postmark style: [{ Name, Value }]
    for (const item of value) {
      if (item && typeof item === "object") {
        const entry = item as Record<string, unknown>;
        const name = entry.Name ?? entry.name;
        const val = entry.Value ?? entry.value;

        if (typeof name === "string" && typeof val === "string") {
          out[name.toLowerCase()] = val;
        }
      }
    }
  } else if (value && typeof value === "object") {
    for (const [name, val] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (typeof val === "string") out[name.toLowerCase()] = val;
    }
  } else if (typeof value === "string") {
    // Raw header block: "Name: value" lines.
    for (const line of value.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z0-9-]+):\s*(.*)$/);

      if (match) out[match[1]!.toLowerCase()] = match[2]!;
    }
  }

  return out;
}

/** Accept the common field spellings from the big mail providers. */
export function parseInbound(raw: unknown): EmailParse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { ok: false, reason: "invalid" };
  const body = raw as Record<string, unknown>;
  const fromRaw = pickString(body, ["from", "From", "sender", "FromFull"]);
  const sender = parseAddress(fromRaw);

  if (!sender.address) return { ok: false, reason: "no_sender" };
  const text = pickString(body, [
    "text",
    "TextBody",
    "body-plain",
    "plain",
    "body",
  ]);
  const subject = pickString(body, ["subject", "Subject"]);

  if (!subject.trim() && !text.trim()) return { ok: false, reason: "empty" };
  const explicitName = pickString(body, ["fromName", "FromName"]);

  return {
    ok: true,
    email: {
      from: sender.address,
      fromName: (explicitName || sender.name).slice(0, MAX_SENDER),
      subject,
      text,
      messageId: pickString(body, [
        "messageId",
        "MessageID",
        "message-id",
        "Message-Id",
      ]),
      headers: normaliseHeaders(body.headers ?? body.Headers),
    },
  };
}

const AUTO_SENDERS =
  /^(mailer-daemon|postmaster|no-?reply|donotreply|do-not-reply|bounce[s]?|notifications?)@/i;
const AUTO_SUBJECTS =
  /^\s*(auto(matic)?[- ]?(reply|response)|out of office|undeliverable|delivery (status|failure)|returned mail|failure notice)/i;

/**
 * True for mail a human did not write: auto-replies, bounces, list traffic. Dropping it stops
 * mail loops, which is the main way an inbound address gets abused.
 */
export function isAutomated(email: InboundEmail): boolean {
  const h = email.headers;
  const auto = (h["auto-submitted"] ?? "").toLowerCase();

  if (auto && auto !== "no") return true;
  if (h["x-auto-response-suppress"]) return true;
  if (h["x-autoreply"] || h["x-autorespond"]) return true;
  if (
    (h["precedence"] ?? "").toLowerCase().match(/^(bulk|junk|list|auto_reply)$/)
  )
    return true;
  if (h["list-id"] || h["list-unsubscribe"]) return true;
  if (AUTO_SENDERS.test(email.from)) return true;
  if (AUTO_SUBJECTS.test(email.subject)) return true;

  return false;
}

/** Drop everything from the first quoted-reply marker or signature delimiter on. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;

    if (/^--\s?$/.test(line)) break; // signature delimiter
    if (/^On .{5,200} wrote:\s*$/.test(line)) break;
    if (
      /^-{2,}\s*(Original Message|Forwarded message)\s*-{2,}$/i.test(
        line.trim(),
      )
    )
      break;
    if (
      /^_{5,}$/.test(line.trim()) &&
      /^(From|De|Von):/i.test(lines[i + 1] ?? "")
    )
      break;
    if (/^From:\s.+/i.test(line) && /^(Sent|Date):/i.test(lines[i + 1] ?? ""))
      break;
    if (line.startsWith(">")) continue; // a quoted line
    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove `Re:` / `Fwd:` prefixes (repeated, any case) so a thread keeps one clean title. */
export function cleanSubject(subject: string): string {
  let out = subject.replace(/[\r\n]+/g, " ").trim();

  for (;;) {
    const next = out.replace(
      /^\s*((re|fwd?|aw|sv|tr)\s*(\[\d+\])?\s*:\s*)+/i,
      "",
    );

    if (next === out) break;
    out = next;
  }

  return out.trim();
}

export type EmailIssue = {
  title: string;
  description: string;
  /** Lower-case address, used to match or create a customer. */
  customerName: string;
  senderAddress: string;
};

/** Build the issue fields. Plain text only; the body is capped. */
export function toIssue(email: InboundEmail): EmailIssue {
  const subject = cleanSubject(email.subject);
  const body = stripQuotedReply(email.text);
  const firstLine = body.split("\n").find((line) => line.trim()) ?? "";
  const title = (subject || firstLine || "Email request")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE);
  const who = email.fromName ? `${email.fromName} <${email.from}>` : email.from;
  const description = [
    `Received by email from ${who}.`,
    "",
    body.slice(0, MAX_BODY) || "(no message body)",
  ].join("\n");

  return {
    title,
    description,
    customerName: email.fromName || email.from.split("@")[1] || email.from,
    senderAddress: email.from,
  };
}

/** The domain part of an address, for matching a customer record by domain. */
export function domainOf(address: string): string {
  return address.split("@")[1]?.toLowerCase() ?? "";
}

/** Free webmail domains never identify a company, so they must not match a customer. */
const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com",
  "zoho.com",
]);

export function isCompanyDomain(domain: string): boolean {
  return Boolean(domain) && !FREE_MAIL.has(domain.toLowerCase());
}
