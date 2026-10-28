import { describe, expect, it } from "vitest";

import {
  buildCreateOutboxPayload,
  buildUpdateOutboxPayload,
  normalizeDueDate,
} from "@/lib/offline/outbox-payload";

describe("outbox payloads", () => {
  it("create payload includes estimate, dueDate, projectId, labelIds", () => {
    const payload = buildCreateOutboxPayload(
      {
        title: "Ship it",
        estimate: "M",
        dueDate: "2026-11-01",
        projectId: "clxxxxxxxxxxxxxxxxx",
        labelIds: ["claaaaaaaaaaaaaaaaa", "clbbbbbbbbbbbbbbbbb"],
        assigneeId: null,
        cycleId: null,
      },
      "cm-1",
    );

    expect(payload.estimate).toBe("M");
    expect(payload.projectId).toBe("clxxxxxxxxxxxxxxxxx");
    expect(payload.labelIds).toEqual([
      "claaaaaaaaaaaaaaaaa",
      "clbbbbbbbbbbbbbbbbb",
    ]);
    expect(payload.dueDate).toMatch(/2026-11-01/);
    expect(payload.clientMutationId).toBe("cm-1");
  });

  it("create payload defaults empty dueDate to null", () => {
    const payload = buildCreateOutboxPayload(
      { title: "x", dueDate: "" },
      "cm-2",
    );

    expect(payload.dueDate).toBeNull();
    expect(payload.estimate).toBe("NONE");
    expect(payload.labelIds).toEqual([]);
  });

  it("update payload normalizes dueDate", () => {
    const payload = buildUpdateOutboxPayload({
      title: "Updated",
      estimate: "L",
      projectId: "clxxxxxxxxxxxxxxxxx",
      dueDate: "2026-12-15",
    });

    expect(payload.estimate).toBe("L");
    expect(payload.projectId).toBe("clxxxxxxxxxxxxxxxxx");
    expect(payload.dueDate).toMatch(/2026-12-15/);
  });

  it("normalizeDueDate rejects invalid", () => {
    expect(normalizeDueDate("not-a-date")).toBeNull();
    expect(normalizeDueDate(null)).toBeNull();
  });
});
