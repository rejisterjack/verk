import { describe, expect, it } from "vitest";

function redirectTarget(formData: FormData) {
  const target = String(formData.get("redirectTo") ?? "");

  return target.startsWith("/t/") ? target : null;
}

describe("document redirect safety", () => {
  it("accepts in-app team paths only", () => {
    const fd = new FormData();

    fd.set("redirectTo", "/t/acme-engineering/docs");
    expect(redirectTarget(fd)).toBe("/t/acme-engineering/docs");
  });

  it("rejects external redirect targets", () => {
    const fd = new FormData();

    fd.set("redirectTo", "https://evil.example/phish");
    expect(redirectTarget(fd)).toBeNull();
  });
});