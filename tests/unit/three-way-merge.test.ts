import { describe, expect, it } from "vitest";

import { diffLines, diffStats } from "@/lib/line-diff";
import { mergeThreeWay } from "@/lib/three-way-merge";

const base = ["one", "two", "three", "four", "five"].join("\n");

describe("mergeThreeWay", () => {
  it("returns the shared text when both sides are equal", () => {
    expect(mergeThreeWay(base, "x", "x")).toEqual({
      ok: true,
      text: "x",
      autoMerged: false,
    });
  });

  it("takes theirs when I changed nothing, and mine when they changed nothing", () => {
    expect(mergeThreeWay(base, base, "theirs")).toEqual({
      ok: true,
      text: "theirs",
      autoMerged: false,
    });
    expect(mergeThreeWay(base, "mine", base)).toEqual({
      ok: true,
      text: "mine",
      autoMerged: false,
    });
  });

  it("merges edits to different lines without a conflict", () => {
    const mine = base.replace("two", "TWO");
    const theirs = base.replace("four", "FOUR");
    const result = mergeThreeWay(base, mine, theirs);

    expect(result).toEqual({
      ok: true,
      autoMerged: true,
      text: "one\nTWO\nthree\nFOUR\nfive",
    });
  });

  it("merges an insertion on one side with an edit on the other", () => {
    const mine = base.replace("one", "one\none-and-a-half");
    const theirs = base.replace("five", "FIVE");
    const result = mergeThreeWay(base, mine, theirs);

    expect(result.ok).toBe(true);
    expect(result.text).toBe("one\none-and-a-half\ntwo\nthree\nfour\nFIVE");
  });

  it("reports a conflict, with markers, when both sides edit the same line", () => {
    const result = mergeThreeWay(
      base,
      base.replace("three", "mine"),
      base.replace("three", "theirs"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.conflicts).toBe(1);
      expect(result.text).toContain("<<<<<<< yours\nmine\n=======\ntheirs\n>>>>>>> theirs");
      // The untouched lines are kept on both sides of the conflict.
      expect(result.text.startsWith("one\ntwo\n")).toBe(true);
      expect(result.text.endsWith("four\nfive")).toBe(true);
    }
  });

  it("does not call identical edits a conflict", () => {
    const edited = base.replace("three", "same");
    const result = mergeThreeWay(base, edited, edited + "");

    expect(result.ok).toBe(true);
    expect(result.text).toBe(edited);
  });

  it("never silently drops text: both sides of a conflict are present", () => {
    const result = mergeThreeWay("a", "mine only", "theirs only");

    expect(result.ok).toBe(false);
    expect(result.text).toContain("mine only");
    expect(result.text).toContain("theirs only");
  });

  it("gives up safely on very large documents", () => {
    const big = Array.from({ length: 2001 }, (_, i) => `line ${i}`).join("\n");
    const result = mergeThreeWay(big, `${big}\nmine`, `${big}\ntheirs`);

    expect(result.ok).toBe(false);
    expect(result.text).toBe(`${big}\nmine`);
  });
});

describe("diffLines", () => {
  it("marks additions, deletions and unchanged lines", () => {
    const lines = diffLines("a\nb\nc", "a\nB\nc");

    expect(lines.map((line) => line.kind)).toEqual([
      "same",
      "del",
      "add",
      "same",
    ]);
    expect(lines.find((line) => line.kind === "del")?.text).toBe("b");
    expect(lines.find((line) => line.kind === "add")?.text).toBe("B");
  });

  it("counts what changed", () => {
    const stats = diffStats(diffLines("a\nb\nc", "a\nB\nc\nd"));

    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(1);
  });
});