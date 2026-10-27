import { describe, expect, it } from "vitest";

import {
  orderOutboxOps,
  reduceConflict,
  remapOutboxIssueIds,
  shouldBlockIssueChain,
} from "@/lib/offline/sync-logic";
import { isTmpIssueId, newTmpIssueId } from "@/lib/offline/ids";

describe("outbox ordering", () => {
  it("keeps FIFO by createdAt and causality within an issue", () => {
    const ops = orderOutboxOps([
      { issueId: "a", createdAt: 30, status: "queued" as const },
      { issueId: "b", createdAt: 10, status: "queued" as const },
      { issueId: "a", createdAt: 20, status: "queued" as const },
    ]);

    expect(ops.map((o) => o.createdAt)).toEqual([10, 20, 30]);
  });
});

describe("tmp id remap", () => {
  it("rewrites later outbox rows from tmp to server id", () => {
    const tmp = "tmp_abc";
    const remapped = remapOutboxIssueIds(
      [
        { issueId: tmp, op: "create" },
        { issueId: tmp, op: "update" },
        { issueId: "other", op: "update" },
      ],
      tmp,
      "clxyz",
    );

    expect(remapped.map((o) => o.issueId)).toEqual(["clxyz", "clxyz", "other"]);
  });

  it("detects provisional ids", () => {
    expect(isTmpIssueId(newTmpIssueId())).toBe(true);
    expect(isTmpIssueId("clabcdefghij")).toBe(false);
  });
});

describe("revision conflict reducer", () => {
  it("keeps server fields when choosing server", () => {
    const result = reduceConflict(
      { title: "Server", description: "S", revision: 3 },
      { title: "Mine", description: "M" },
      "keep_server",
    );

    expect(result).toMatchObject({
      title: "Server",
      description: "S",
      revision: 3,
      dropLocal: true,
    });
  });

  it("keeps mine with server revision base when choosing mine", () => {
    const result = reduceConflict(
      { title: "Server", description: "S", revision: 3 },
      { title: "Mine", description: "M" },
      "keep_mine",
    );

    expect(result).toMatchObject({
      title: "Mine",
      description: "M",
      revision: 3,
      dropLocal: false,
    });
  });

  it("blocks exhausted issue chains", () => {
    expect(shouldBlockIssueChain({ status: "failed", attempts: 10 })).toBe(true);
    expect(shouldBlockIssueChain({ status: "queued", attempts: 2 })).toBe(false);
  });
});
