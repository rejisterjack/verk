import { describe, expect, it } from "vitest";

import {
  classifyMergeRequest,
  mergeRequestText,
  verifyGitlabToken,
  type MergeRequestPayload,
} from "@/lib/gitlab-events";

function mr(
  action: string,
  extra: Partial<NonNullable<MergeRequestPayload["object_attributes"]>> = {},
): MergeRequestPayload {
  return {
    object_kind: "merge_request",
    object_attributes: { iid: 1, action, ...extra },
  };
}

describe("classifyMergeRequest", () => {
  it("starts work when a ready merge request opens or reopens", () => {
    expect(classifyMergeRequest(mr("open"))).toEqual({ kind: "started" });
    expect(classifyMergeRequest(mr("reopen"))).toEqual({ kind: "started" });
  });

  it("only links a draft", () => {
    expect(classifyMergeRequest(mr("open", { draft: true }))).toEqual({
      kind: "link",
    });
    expect(
      classifyMergeRequest(mr("open", { work_in_progress: true })),
    ).toEqual({ kind: "link" });
  });

  it("treats an update as a link, never a state change", () => {
    expect(classifyMergeRequest(mr("update"))).toEqual({ kind: "link" });
  });

  it("finishes on merge and flags a close without merge", () => {
    expect(classifyMergeRequest(mr("merge"))).toEqual({ kind: "merged" });
    expect(classifyMergeRequest(mr("close"))).toEqual({
      kind: "closed_unmerged",
    });
  });

  it("ignores other events and unknown actions", () => {
    expect(classifyMergeRequest(mr("approved"))).toEqual({ kind: "ignore" });
    expect(
      classifyMergeRequest({ object_kind: "push", object_attributes: {} }),
    ).toEqual({ kind: "ignore" });
    expect(classifyMergeRequest({ object_kind: "merge_request" })).toEqual({
      kind: "ignore",
    });
  });

  it("also reads the newer event_type field", () => {
    expect(
      classifyMergeRequest({
        event_type: "merge_request",
        object_attributes: { action: "merge" },
      }),
    ).toEqual({ kind: "merged" });
  });
});

describe("mergeRequestText", () => {
  it("joins title, description and branch for issue-key matching", () => {
    expect(
      mergeRequestText(
        mr("open", {
          title: "Fix login",
          description: "fixes ENG-12",
          source_branch: "eng-12-fix-login",
        }),
      ),
    ).toBe("Fix login\nfixes ENG-12\neng-12-fix-login");
  });

  it("skips missing parts", () => {
    expect(mergeRequestText(mr("open", { title: "Only title" }))).toBe(
      "Only title",
    );
    expect(mergeRequestText({})).toBe("");
  });
});

describe("verifyGitlabToken", () => {
  it("accepts the exact secret", () => {
    expect(verifyGitlabToken("s3cret", "s3cret")).toBe(true);
  });

  it("rejects a wrong, empty or differently-sized token without throwing", () => {
    expect(verifyGitlabToken("s3cret", "s3cre")).toBe(false);
    expect(verifyGitlabToken("s3cret", "s3cret-and-more")).toBe(false);
    expect(verifyGitlabToken("s3cret", "")).toBe(false);
    expect(verifyGitlabToken("", "anything")).toBe(false);
  });
});