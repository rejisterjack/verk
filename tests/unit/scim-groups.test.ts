import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  team: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  user: { findMany: vi.fn() },
  membership: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitShared: vi.fn(async () => ({ ok: true, remaining: 19 })),
}));

import {
  applyGroupOperations,
  groupResource,
  parseGroupOperations,
} from "@/lib/scim";
import { applyGroupMembership } from "@/lib/services/scim-groups";

const TOKEN = "scim-secret";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SCIM_TOKEN", TOKEN);
  db.membership.deleteMany.mockResolvedValue({ count: 0 });
  db.membership.createMany.mockResolvedValue({ count: 0 });
});

describe("parseGroupOperations", () => {
  it("parses add with a members path", () => {
    expect(
      parseGroupOperations([
        { op: "add", path: "members", value: [{ value: "u1" }, { value: "u2" }] },
      ]),
    ).toEqual({
      ops: [{ kind: "add", members: [{ id: "u1" }, { id: "u2" }] }],
    });
  });

  it('parses the filtered remove path members[value eq "u1"]', () => {
    expect(
      parseGroupOperations([{ op: "remove", path: 'members[value eq "u1"]' }]),
    ).toEqual({ ops: [{ kind: "remove", members: [{ id: "u1" }] }] });
  });

  it("parses Okta-style remove with a value list", () => {
    expect(
      parseGroupOperations([
        { op: "remove", path: "members", value: [{ value: "u1" }] },
      ]).ops,
    ).toEqual([{ kind: "remove", members: [{ id: "u1" }] }]);
  });

  it("parses replace", () => {
    expect(
      parseGroupOperations([
        { op: "Replace", path: "members", value: [{ value: "u3" }] },
      ]).ops,
    ).toEqual([{ kind: "replace", members: [{ id: "u3" }] }]);
  });

  it("accepts a path-less op whose value carries members", () => {
    expect(
      parseGroupOperations([
        { op: "add", value: { members: [{ value: "u9" }] } },
      ]).ops,
    ).toEqual([{ kind: "add", members: [{ id: "u9" }] }]);
  });

  it("still accepts the legacy email form", () => {
    expect(
      parseGroupOperations([
        { op: "add", path: "members", value: [{ value: "Ada@X.dev" }] },
      ]).ops,
    ).toEqual([{ kind: "add", members: [{ email: "ada@x.dev" }] }]);
  });

  it("rejects an unsupported op, and a members filter on anything but remove", () => {
    expect(parseGroupOperations([{ op: "move", path: "members" }]).error).toMatch(
      /Unsupported op/,
    );
    expect(
      parseGroupOperations([{ op: "add", path: 'members[value eq "u1"]' }]).error,
    ).toMatch(/only valid with remove/);
  });

  it("ignores displayName changes instead of failing", () => {
    expect(
      parseGroupOperations([{ op: "replace", path: "displayName", value: "X" }]),
    ).toEqual({ ops: [] });
  });
});

describe("applyGroupOperations", () => {
  const same = (ref: { id?: string }) => ref.id ?? null;

  it("adds, removes and replaces", () => {
    const current = new Set(["a", "b"]);

    expect(
      [
        ...applyGroupOperations(current, [{ kind: "add", members: [{ id: "c" }] }], same),
      ].sort(),
    ).toEqual(["a", "b", "c"]);
    expect(
      [
        ...applyGroupOperations(current, [{ kind: "remove", members: [{ id: "a" }] }], same),
      ],
    ).toEqual(["b"]);
    expect(
      [
        ...applyGroupOperations(
          current,
          [{ kind: "replace", members: [{ id: "x" }, { id: "y" }] }],
          same,
        ),
      ].sort(),
    ).toEqual(["x", "y"]);
  });

  it("does not mutate the original set", () => {
    const current = new Set(["a"]);

    applyGroupOperations(current, [{ kind: "add", members: [{ id: "b" }] }], same);
    expect([...current]).toEqual(["a"]);
  });
});

describe("applyGroupMembership", () => {
  function setup(
    members: { userId: string; role: "OWNER" | "ADMIN" | "MEMBER" }[],
    users: { id: string; email: string }[],
  ) {
    db.membership.findMany.mockResolvedValue(members);
    db.user.findMany.mockResolvedValue(users);
  }

  it("adding a user creates a MEMBER membership", async () => {
    setup(
      [{ userId: "owner", role: "OWNER" }],
      [{ id: "u1", email: "ada@x.dev" }],
    );

    await expect(
      applyGroupMembership("t1", [{ kind: "add", members: [{ id: "u1" }] }]),
    ).resolves.toEqual({ added: 1, removed: 0 });
    expect(db.membership.createMany).toHaveBeenCalledWith({
      data: [{ teamId: "t1", userId: "u1", role: "MEMBER" }],
      skipDuplicates: true,
    });
  });

  it("adding an existing member keeps their role and creates nothing", async () => {
    setup(
      [
        { userId: "owner", role: "OWNER" },
        { userId: "u1", role: "ADMIN" },
      ],
      [{ id: "u1", email: "ada@x.dev" }],
    );

    await expect(
      applyGroupMembership("t1", [{ kind: "add", members: [{ id: "u1" }] }]),
    ).resolves.toEqual({ added: 0, removed: 0 });
    expect(db.membership.createMany).not.toHaveBeenCalled();
  });

  it("removing a user deletes the membership", async () => {
    setup(
      [
        { userId: "owner", role: "OWNER" },
        { userId: "u1", role: "MEMBER" },
      ],
      [{ id: "u1", email: "ada@x.dev" }],
    );

    await expect(
      applyGroupMembership("t1", [{ kind: "remove", members: [{ id: "u1" }] }]),
    ).resolves.toEqual({ added: 0, removed: 1 });
    expect(db.membership.deleteMany).toHaveBeenCalledWith({
      where: { teamId: "t1", userId: { in: ["u1"] }, role: { not: "OWNER" } },
    });
  });

  it("an OWNER survives remove and replace, however the IdP asks", async () => {
    setup(
      [
        { userId: "owner", role: "OWNER" },
        { userId: "u1", role: "MEMBER" },
      ],
      [
        { id: "owner", email: "boss@x.dev" },
        { id: "u1", email: "ada@x.dev" },
      ],
    );

    await applyGroupMembership("t1", [
      { kind: "remove", members: [{ id: "owner" }] },
    ]);
    expect(db.membership.deleteMany).not.toHaveBeenCalled();

    await applyGroupMembership("t1", [{ kind: "replace", members: [] }]);
    expect(db.membership.deleteMany).toHaveBeenCalledWith({
      where: { teamId: "t1", userId: { in: ["u1"] }, role: { not: "OWNER" } },
    });
  });

  it("replace sets the exact member list", async () => {
    setup(
      [
        { userId: "owner", role: "OWNER" },
        { userId: "u1", role: "MEMBER" },
        { userId: "u2", role: "MEMBER" },
      ],
      [
        { id: "u2", email: "b@x.dev" },
        { id: "u3", email: "c@x.dev" },
      ],
    );

    await expect(
      applyGroupMembership("t1", [
        { kind: "replace", members: [{ id: "u2" }, { id: "u3" }] },
      ]),
    ).resolves.toEqual({ added: 1, removed: 1 });
    expect(db.membership.createMany).toHaveBeenCalledWith({
      data: [{ teamId: "t1", userId: "u3", role: "MEMBER" }],
      skipDuplicates: true,
    });
  });

  it("matches the legacy email form and skips users that don't exist", async () => {
    setup(
      [{ userId: "owner", role: "OWNER" }],
      [{ id: "u1", email: "Ada@X.dev" }],
    );

    await expect(
      applyGroupMembership("t1", [
        {
          kind: "add",
          members: [{ email: "ada@x.dev" }, { email: "ghost@x.dev" }, { id: "nope" }],
        },
      ]),
    ).resolves.toEqual({ added: 1, removed: 0 });
  });
});

describe("groupResource", () => {
  it("maps a team to a SCIM group with members", () => {
    expect(
      groupResource(
        { id: "t1", name: "Acme", slug: "acme" },
        [{ id: "u1", email: "ada@x.dev" }],
      ),
    ).toEqual({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
      id: "t1",
      displayName: "Acme",
      externalId: "acme",
      members: [{ value: "u1", display: "ada@x.dev" }],
    });
  });

  it("omits members when none are supplied (list view)", () => {
    expect(groupResource({ id: "t1", name: "A", slug: "a" })).not.toHaveProperty(
      "members",
    );
  });
});

describe("Groups routes", () => {
  const call = (
    handler: (r: Request, c: { params: Promise<{ id: string }> }) => Promise<Response>,
    method: string,
    path: string,
    id = "t1",
    body?: unknown,
    token: string | null = TOKEN,
  ) =>
    handler(
      new Request(`http://localhost${path}`, {
        method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body:
          body === undefined || method === "GET" || method === "DELETE"
            ? undefined
            : JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  it("answers 401 with a SCIM error body for a bad or missing token", async () => {
    const route = await import("@/app/api/scim/Groups/[id]/route");
    const bad = await call(route.GET, "GET", "/api/scim/Groups/t1", "t1", undefined, "wrong");
    const none = await call(route.GET, "GET", "/api/scim/Groups/t1", "t1", undefined, null);

    expect(bad.status).toBe(401);
    expect(none.status).toBe(401);
    await expect(bad.json()).resolves.toMatchObject({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      status: "401",
    });
  });

  it("answers 401 when SCIM_TOKEN is not configured at all", async () => {
    vi.stubEnv("SCIM_TOKEN", "");
    const route = await import("@/app/api/scim/Groups/[id]/route");

    expect((await call(route.GET, "GET", "/api/scim/Groups/t1")).status).toBe(401);
  });

  it("an unknown group is a SCIM 404 for GET, PATCH, PUT and DELETE", async () => {
    db.team.findUnique.mockResolvedValue(null);
    const route = await import("@/app/api/scim/Groups/[id]/route");

    for (const [handler, method] of [
      [route.GET, "GET"],
      [route.PATCH, "PATCH"],
      [route.PUT, "PUT"],
      [route.DELETE, "DELETE"],
    ] as const) {
      const response = await call(handler, method, "/api/scim/Groups/nope", "nope", {});

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ status: "404" });
    }
  });

  it("GET /Groups/{id} lists members by user id", async () => {
    db.team.findUnique.mockResolvedValue({ id: "t1", name: "Acme", slug: "acme" });
    db.membership.findMany.mockResolvedValue([
      { user: { id: "u1", email: "ada@x.dev" } },
    ]);
    const route = await import("@/app/api/scim/Groups/[id]/route");
    const response = await call(route.GET, "GET", "/api/scim/Groups/t1");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/scim+json");
    await expect(response.json()).resolves.toMatchObject({
      id: "t1",
      displayName: "Acme",
      members: [{ value: "u1", display: "ada@x.dev" }],
    });
  });

  it("PATCH rejects an invalid body with 400", async () => {
    db.team.findUnique.mockResolvedValue({ id: "t1", name: "Acme", slug: "acme" });
    const route = await import("@/app/api/scim/Groups/[id]/route");
    const response = await call(route.PATCH, "PATCH", "/api/scim/Groups/t1", "t1", {
      Operations: [{ op: "explode" }],
    });

    expect(response.status).toBe(400);
  });

  it("DELETE empties the group but never deletes OWNERs or the team", async () => {
    db.team.findUnique.mockResolvedValue({ id: "t1", name: "Acme", slug: "acme" });
    db.membership.deleteMany.mockResolvedValue({ count: 3 });
    const route = await import("@/app/api/scim/Groups/[id]/route");
    const response = await call(route.DELETE, "DELETE", "/api/scim/Groups/t1");

    expect(response.status).toBe(204);
    expect(db.membership.deleteMany).toHaveBeenCalledWith({
      where: { teamId: "t1", role: { not: "OWNER" } },
    });
  });

  it("legacy PATCH /Groups?id= still works", async () => {
    db.team.findUnique.mockResolvedValue({ id: "t1", name: "Acme", slug: "acme" });
    db.membership.findMany
      .mockResolvedValueOnce([{ userId: "owner", role: "OWNER" }])
      .mockResolvedValueOnce([]);
    db.user.findMany.mockResolvedValue([{ id: "u1", email: "ada@x.dev" }]);
    const route = await import("@/app/api/scim/Groups/route");
    const response = await route.PATCH(
      new Request("http://localhost/api/scim/Groups?id=t1", {
        method: "PATCH",
        headers: { authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({
          Operations: [{ op: "add", value: [{ value: "ada@x.dev" }] }],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(db.membership.createMany).toHaveBeenCalledWith({
      data: [{ teamId: "t1", userId: "u1", role: "MEMBER" }],
      skipDuplicates: true,
    });
  });

  it("POST /Groups links to an existing team and never creates one", async () => {
    db.team.findFirst.mockResolvedValue({ id: "t1", name: "Acme", slug: "acme" });
    db.membership.findMany.mockResolvedValue([]);
    const route = await import("@/app/api/scim/Groups/route");
    const created = await route.POST(
      new Request("http://localhost/api/scim/Groups", {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ displayName: "Acme" }),
      }),
    );

    expect(created.status).toBe(201);

    db.team.findFirst.mockResolvedValue(null);
    const missing = await route.POST(
      new Request("http://localhost/api/scim/Groups", {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ displayName: "No Such Team" }),
      }),
    );

    expect(missing.status).toBe(404);
  });

  it("list supports the displayName filter and pagination", async () => {
    db.team.findMany.mockResolvedValue([
      { id: "t1", name: "Acme", slug: "acme" },
      { id: "t2", name: "Beta", slug: "beta" },
    ]);
    const route = await import("@/app/api/scim/Groups/route");
    const response = await route.GET(
      new Request(
        'http://localhost/api/scim/Groups?filter=displayName%20eq%20%22Acme%22&startIndex=1&count=1',
        { headers: { authorization: `Bearer ${TOKEN}` } },
      ),
    );
    const json = (await response.json()) as {
      totalResults: number;
      itemsPerPage: number;
      Resources: unknown[];
    };

    expect(json.totalResults).toBe(2);
    expect(json.itemsPerPage).toBe(1);
    expect(db.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { equals: "Acme", mode: "insensitive" } },
            { slug: "acme" },
          ],
        },
      }),
    );
  });
});