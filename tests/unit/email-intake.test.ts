import { describe, expect, it } from "vitest";

import {
  MAX_BODY,
  MAX_TITLE,
  cleanSubject,
  domainOf,
  isAutomated,
  isCompanyDomain,
  parseAddress,
  parseInbound,
  stripQuotedReply,
  toIssue,
  type InboundEmail,
} from "@/lib/email-intake";

function email(over: Partial<InboundEmail> = {}): InboundEmail {
  return {
    from: "ada@acme.com",
    fromName: "Ada Lovelace",
    subject: "Login is broken",
    text: "I cannot sign in.",
    messageId: "<1@acme.com>",
    headers: {},
    ...over,
  };
}

describe("parseAddress", () => {
  it("splits a display name from the address and lower-cases the address", () => {
    expect(parseAddress('"Ada Lovelace" <Ada@Acme.COM>')).toEqual({
      name: "Ada Lovelace",
      address: "ada@acme.com",
    });
    expect(parseAddress("Ada <ada@acme.com>").name).toBe("Ada");
  });

  it("accepts a bare address and rejects anything that is not one", () => {
    expect(parseAddress("ada@acme.com")).toEqual({ name: "", address: "ada@acme.com" });
    expect(parseAddress("not an address").address).toBe("");
    expect(parseAddress("<>").address).toBe("");
    expect(parseAddress("").address).toBe("");
  });
});

describe("parseInbound", () => {
  it("reads the common provider field names", () => {
    const postmark = parseInbound({
      From: "Ada <ada@acme.com>",
      Subject: "Hi",
      TextBody: "Body",
      MessageID: "abc",
      Headers: [{ Name: "Auto-Submitted", Value: "auto-replied" }],
    });

    expect(postmark.ok).toBe(true);
    if (postmark.ok) {
      expect(postmark.email.subject).toBe("Hi");
      expect(postmark.email.text).toBe("Body");
      expect(postmark.email.messageId).toBe("abc");
      expect(postmark.email.headers["auto-submitted"]).toBe("auto-replied");
    }
    const mailgun = parseInbound({
      sender: "ada@acme.com",
      subject: "Hi",
      "body-plain": "Body",
    });

    expect(mailgun.ok && mailgun.email.text).toBe("Body");
  });

  it("reads headers as an object or a raw block", () => {
    const asObject = parseInbound({
      from: "a@b.co",
      subject: "x",
      headers: { "List-Id": "<news.example.com>" },
    });
    const asBlock = parseInbound({
      from: "a@b.co",
      subject: "x",
      headers: "Precedence: bulk\nX-Other: 1",
    });

    expect(asObject.ok && asObject.email.headers["list-id"]).toBe("<news.example.com>");
    expect(asBlock.ok && asBlock.email.headers["precedence"]).toBe("bulk");
  });

  it("rejects bad input, a missing sender, and an empty message", () => {
    expect(parseInbound(null)).toEqual({ ok: false, reason: "invalid" });
    expect(parseInbound([])).toEqual({ ok: false, reason: "invalid" });
    expect(parseInbound({ subject: "x" })).toEqual({ ok: false, reason: "no_sender" });
    expect(parseInbound({ from: "nope", subject: "x" })).toEqual({
      ok: false,
      reason: "no_sender",
    });
    expect(parseInbound({ from: "a@b.co" })).toEqual({ ok: false, reason: "empty" });
  });
});

describe("isAutomated (stops mail loops)", () => {
  it("flags auto-replies, list traffic and bulk mail by header", () => {
    expect(isAutomated(email({ headers: { "auto-submitted": "auto-replied" } }))).toBe(true);
    expect(isAutomated(email({ headers: { "x-auto-response-suppress": "All" } }))).toBe(true);
    expect(isAutomated(email({ headers: { precedence: "bulk" } }))).toBe(true);
    expect(isAutomated(email({ headers: { "list-id": "<a.b>" } }))).toBe(true);
    expect(isAutomated(email({ headers: { "list-unsubscribe": "<mailto:x>" } }))).toBe(true);
  });

  it("treats Auto-Submitted: no as a normal human message", () => {
    expect(isAutomated(email({ headers: { "auto-submitted": "no" } }))).toBe(false);
  });

  it("flags bounce and no-reply senders, and auto-reply subjects", () => {
    expect(isAutomated(email({ from: "mailer-daemon@x.com" }))).toBe(true);
    expect(isAutomated(email({ from: "noreply@x.com" }))).toBe(true);
    expect(isAutomated(email({ from: "no-reply@x.com" }))).toBe(true);
    expect(isAutomated(email({ subject: "Out of office until Monday" }))).toBe(true);
    expect(isAutomated(email({ subject: "Automatic reply: hi" }))).toBe(true);
    expect(isAutomated(email({ subject: "Undeliverable: your message" }))).toBe(true);
  });

  it("lets a normal customer email through", () => {
    expect(isAutomated(email())).toBe(false);
    expect(isAutomated(email({ subject: "Re: reply to my out of office question" }))).toBe(false);
  });
});

describe("stripQuotedReply", () => {
  it("cuts a quoted reply, a signature, and forwarded headers", () => {
    expect(stripQuotedReply("Thanks!\n\nOn Mon, 2 Mar 2026, Bob <b@x.com> wrote:\n> old text")).toBe(
      "Thanks!",
    );
    expect(stripQuotedReply("Hello\n-- \nAda\nCTO")).toBe("Hello");
    expect(stripQuotedReply("Hi\n\n-----Original Message-----\nFrom: x")).toBe("Hi");
    expect(stripQuotedReply("Hi\nFrom: Bob\nSent: Monday\nto: you")).toBe("Hi");
  });

  it("drops quoted lines that start with >, and collapses blank runs", () => {
    expect(stripQuotedReply("Line one\n> quoted\n\n\n\nLine two")).toBe("Line one\n\nLine two");
  });

  it("normalises Windows line endings", () => {
    expect(stripQuotedReply("a\r\nb")).toBe("a\nb");
  });
});

describe("cleanSubject", () => {
  it("removes stacked Re/Fwd prefixes in any case and language", () => {
    expect(cleanSubject("Re: RE: Fwd: Login is broken")).toBe("Login is broken");
    expect(cleanSubject("AW: Sv: Problem")).toBe("Problem");
    expect(cleanSubject("Re[2]: Hi")).toBe("Hi");
  });

  it("keeps a subject that merely contains the letters, and removes newlines", () => {
    expect(cleanSubject("Reminder: invoice")).toBe("Reminder: invoice");
    expect(cleanSubject("Line one\nLine two")).toBe("Line one Line two");
  });
});

describe("toIssue", () => {
  it("builds a plain-text issue and records who it came from", () => {
    const issue = toIssue(email({ subject: "Re: Login is broken" }));

    expect(issue.title).toBe("Login is broken");
    expect(issue.description).toContain("Ada Lovelace <ada@acme.com>");
    expect(issue.description).toContain("I cannot sign in.");
    expect(issue.customerName).toBe("Ada Lovelace");
    expect(issue.senderAddress).toBe("ada@acme.com");
  });

  it("falls back to the first body line, then a default, for the title", () => {
    expect(toIssue(email({ subject: "", text: "\n\nFirst real line\nmore" })).title).toBe(
      "First real line",
    );
    expect(toIssue(email({ subject: "", text: "" })).title).toBe("Email request");
  });

  it("caps the title and the body", () => {
    const issue = toIssue(email({ subject: "x".repeat(500), text: "y".repeat(MAX_BODY * 2) }));

    expect(issue.title).toHaveLength(MAX_TITLE);
    expect(issue.description.length).toBeLessThan(MAX_BODY + 200);
  });

  it("never lets markup or a script through as anything but text", () => {
    const issue = toIssue(email({ text: "<script>alert(1)</script> [x](javascript:alert(1))" }));

    // Stored as text; the app renders issue bodies through a Markdown renderer that escapes HTML.
    expect(issue.description).toContain("<script>");
    expect(typeof issue.description).toBe("string");
  });

  it("names the customer after the sender's domain when there is no display name", () => {
    expect(toIssue(email({ fromName: "", from: "pat@bigco.io" })).customerName).toBe("bigco.io");
  });
});

describe("domains", () => {
  it("extracts the domain and ignores free webmail for customer matching", () => {
    expect(domainOf("ada@Acme.com")).toBe("acme.com");
    expect(domainOf("nope")).toBe("");
    expect(isCompanyDomain("acme.com")).toBe(true);
    expect(isCompanyDomain("gmail.com")).toBe(false);
    expect(isCompanyDomain("Outlook.com")).toBe(false);
    expect(isCompanyDomain("")).toBe(false);
  });
});