import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));

import {
  MAX_DEPTH,
  getSchema,
  parseAndCheck,
  rootValue,
  type GqlContext,
} from "@/lib/graphql/schema";

const guest: GqlContext = { teamId: "t1", userId: "u1", role: "GUEST" };

describe("GraphQL schema", () => {
  it("builds", () => {
    expect(() => getSchema()).not.toThrow();
  });

  it("accepts queries over the planning surface", () => {
    const checked = parseAndCheck(`{
      initiatives { id name health parentId projects { id name } }
      releases { id name stage { name } issues { number title } }
      views { id name filter }
      documents { id title projectId initiativeId }
    }`);

    expect(checked.errors).toBeUndefined();
    expect(checked.document).toBeDefined();
  });

  it("accepts customers and project dependencies", () => {
    const checked = parseAndCheck(`{
      customers { id name tier arr requests { body issueId } }
      projectDependencies {
        dependencies { projectName dependsOnName }
        conflicts { kind message }
        ready
      }
    }`);

    expect(checked.errors).toBeUndefined();
    expect(
      parseAndCheck(`mutation {
        setCustomerValue(customerId: "c", tier: "Enterprise", arr: 50000) { arr }
        addProjectDependency(projectId: "a", dependsOnId: "b")
        removeProjectDependency(projectId: "a", dependsOnId: "b")
      }`).errors,
    ).toBeUndefined();
  });

  it("accepts the new mutations", () => {
    const checked = parseAndCheck(`mutation {
      createInitiative(input: { name: "Q3", parentId: "x" }) { id }
      updateInitiative(id: "x", input: { health: "AT_RISK" }) { id }
      createRelease(input: { name: "1.0" }) { id }
      setIssueRelease(issueId: "i", releaseId: null)
    }`);

    expect(checked.errors).toBeUndefined();
  });

  it("still rejects unknown fields", () => {
    expect(parseAndCheck("{ nope }").errors?.[0]).toMatch(/Cannot query field/);
  });

  it("still limits depth", () => {
    const deep = `{ releases { issues { ${"id ".repeat(1)} } } }`;

    expect(parseAndCheck(deep).errors).toBeUndefined();
    expect(MAX_DEPTH).toBe(8);
  });
});

describe("GraphQL planning surface needs MEMBER", () => {
  const reads = [
    "initiatives",
    "releases",
    "views",
    "documents",
    "customers",
    "projectDependencies",
  ] as const;

  it.each(reads)("%s refuses a GUEST key", async (name) => {
    await expect(rootValue[name](undefined, guest)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses planning mutations from a GUEST key", async () => {
    await expect(
      rootValue.createInitiative({ input: { name: "x" } }, guest),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      rootValue.updateInitiative({ id: "x", input: {} }, guest),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      rootValue.createRelease({ input: { name: "x" } }, guest),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      rootValue.setIssueRelease({ issueId: "i", releaseId: null }, guest),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      rootValue.setCustomerValue({ customerId: "c", arr: 1 }, guest),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      rootValue.addProjectDependency({ projectId: "a", dependsOnId: "b" }, guest),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      rootValue.removeProjectDependency({ projectId: "a", dependsOnId: "b" }, guest),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});