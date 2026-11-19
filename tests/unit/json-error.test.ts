import { describe, expect, it } from "vitest";

import { jsonError } from "@/lib/http-error";
import { createIssueSchema } from "@/lib/validators";

describe("jsonError", () => {
  it("returns 400 for a Zod validation failure", async () => {
    const parsed = createIssueSchema.safeParse({ title: "" });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const response = jsonError(parsed.error);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION");
  });
});
