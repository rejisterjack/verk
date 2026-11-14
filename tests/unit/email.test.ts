import { describe, expect, it } from "vitest";

import { buildInviteContent } from "@/lib/email";

describe("buildInviteContent", () => {
  it("includes the accept URL in text and HTML", () => {
    const content = buildInviteContent({
      teamName: "Acme <eng>",
      inviteUrl: "https://verk.example/invite/abc",
      inviterName: "Ada",
    });

    expect(content.text).toContain("https://verk.example/invite/abc");
    expect(content.html).toContain("https://verk.example/invite/abc");
    expect(content.html).toContain("Acme &lt;eng&gt;");
    expect(content.html).not.toContain("Acme <eng>");
  });
});
