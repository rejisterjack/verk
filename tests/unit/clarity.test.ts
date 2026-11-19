import { describe, expect, it } from "vitest";

import { clarityProjectId } from "@/lib/clarity";

const id = "zg6yxktt7q";

describe("clarityProjectId", () => {
  it("loads only for a production deploy with a plain project id", () => {
    expect(
      clarityProjectId({
        nodeEnv: "production",
        projectId: id,
      }),
    ).toBe(id);
    expect(
      clarityProjectId({
        nodeEnv: "production",
        vercelEnv: "production",
        projectId: `  ${id}  `,
      }),
    ).toBe(id);
  });

  it("stays off in development and on Vercel preview builds", () => {
    expect(
      clarityProjectId({
        nodeEnv: "development",
        projectId: id,
      }),
    ).toBeNull();
    expect(
      clarityProjectId({
        nodeEnv: "production",
        vercelEnv: "preview",
        projectId: id,
      }),
    ).toBeNull();
    expect(
      clarityProjectId({
        nodeEnv: "production",
        vercelEnv: "development",
        projectId: id,
      }),
    ).toBeNull();
  });

  it("rejects a missing or unsafe project id", () => {
    expect(clarityProjectId({ nodeEnv: "production" })).toBeNull();
    expect(
      clarityProjectId({
        nodeEnv: "production",
        projectId: "bad id",
      }),
    ).toBeNull();
    expect(
      clarityProjectId({
        nodeEnv: "production",
        projectId: '");alert(1);//',
      }),
    ).toBeNull();
  });
});
