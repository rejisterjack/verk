import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  team: { findUnique: vi.fn() },
  membership: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitShared: vi.fn(async () => ({ ok: true, remaining: 19 })),
}));

import { paginateScim } from "@/lib/scim-page";
import { userResource } from "@/lib/scim";

const TOKEN = "scim-secret";
const auth = { authorization: `Bearer ${TOKEN}` };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SCIM_TOKEN", TOKEN);
});

describe("paginateScim", () => {
  it("returns the requested slice and total", () => {
    const page = paginateScim(["a", "b", "c", "d"], "2", "2");

    expect(page.totalResults).toBe(4);
    expect(page.startIndex).toBe(2);
    expect(page.Resources).toEqual(["b", "c"]);
    expect(page.itemsPerPage).toBe(2);
  });
});

describe("userResource", () => {
  it("maps a user and flips disabled to active", () => {
    expect(
      userResource({ id: "u1", email: "a@x.dev", name: null, disabled: true }),
    ).toEqual({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: "u1",
      userName: "a@x.dev",
      name: { formatted: "a@x.dev" },
      active: false,
    });
  });
});

describe("POST /Users", () => {
  const post = async (body: unknown, headers: Record<string, string> = auth) => {
    const route = await import("@/app/api/scim/Users/route");

    return route.POST(
      new Request("http://localhost/api/scim/Users", {
        method: "POST",
        headers,
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  };

  it("creates a user with NO team, the way Okta and Entra do", async () => {
    db.user.upsert.mockResolvedValue({
      id: "u1",
      email: "ada@x.dev",
      name: "Ada",
      disabled: false,
    });
    const response = await post({ userName: "Ada@X.dev", name: { formatted: "Ada" } });

    expect(response.status).toBe(201);
    expect(db.membership.upsert).not.toHaveBeenCalled();
    expect(db.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "ada@x.dev" } }),
    );
  });

  it("adds a membership when a teamId is given", async () => {
    db.team.findUnique.mockResolvedValue({ id: "t1" });
    db.user.upsert.mockResolvedValue({
      id: "u1",
      email: "ada@x.dev",
      name: "Ada",
      disabled: false,
    });
    await post({ userName: "ada@x.dev", teamId: "t1" });

    expect(db.membership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: "u1", teamId: "t1", role: "MEMBER" },
      }),
    );
  });

  it("an unknown teamId is a 404, and nothing is created", async () => {
    db.team.findUnique.mockResolvedValue(null);

    expect((await post({ userName: "ada@x.dev", teamId: "nope" })).status).toBe(404);
    expect(db.user.upsert).not.toHaveBeenCalled();
  });

  it("creates a user as inactive when active is false", async () => {
    db.user.upsert.mockResolvedValue({
      id: "u1",
      email: "ada@x.dev",
      name: "Ada",
      disabled: true,
    });
    await post({ userName: "ada@x.dev", active: false });

    expect(db.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ disabled: true }),
      }),
    );
  });

  it("returns a SCIM 400 for malformed JSON or a missing userName", async () => {
    const bad = await post("{nope");
    const missing = await post({});

    expect(bad.status).toBe(400);
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      scimType: "invalidValue",
    });
  });

  it("is 401 without the SCIM bearer token", async () => {
    expect((await post({ userName: "a@x.dev" }, {})).status).toBe(401);
  });
});

describe("GET /Users", () => {
  const get = async (query: string) => {
    const route = await import("@/app/api/scim/Users/route");

    return route.GET(
      new Request(`http://localhost/api/scim/Users${query}`, { headers: auth }),
    );
  };

  it("lists every user when no teamId is given, so an IdP can find one by userName", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "u1", email: "ada@x.dev", name: "Ada", disabled: false },
    ]);
    const response = await get('?filter=userName%20eq%20%22Ada@X.dev%22');
    const json = (await response.json()) as { totalResults: number };

    expect(response.status).toBe(200);
    expect(json.totalResults).toBe(1);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "ada@x.dev" } }),
    );
  });

  it("lists a team's members when a teamId is given", async () => {
    db.membership.findMany.mockResolvedValue([
      { user: { id: "u1", email: "ada@x.dev", name: "Ada", disabled: false } },
    ]);
    const response = await get("?teamId=t1");

    expect(response.status).toBe(200);
    expect(db.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teamId: "t1" } }),
    );
  });
});

describe("PATCH /Users/{id}", () => {
  const patch = async (id: string, body: unknown) => {
    const route = await import("@/app/api/scim/Users/[id]/route");

    return route.PATCH(
      new Request(`http://localhost/api/scim/Users/${id}`, {
        method: "PATCH",
        headers: auth,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  };

  it("active:false disables the user, which blocks their sessions and keys", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u1" });
    db.user.update.mockResolvedValue({
      id: "u1",
      email: "ada@x.dev",
      name: "Ada",
      disabled: true,
    });
    const response = await patch("u1", {
      Operations: [{ op: "Replace", path: "active", value: false }],
    });

    expect(response.status).toBe(200);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { disabled: true },
    });
    await expect(response.json()).resolves.toMatchObject({ active: false });
  });

  it("an unknown user is a SCIM 404, and an empty patch a 400", async () => {
    db.user.findUnique.mockResolvedValue(null);

    expect(
      (await patch("nope", { Operations: [{ op: "replace", path: "active", value: true }] }))
        .status,
    ).toBe(404);
    expect((await patch("u1", { Operations: [] })).status).toBe(400);
  });
});