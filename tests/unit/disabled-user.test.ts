import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  apiKey: { findFirst: vi.fn(), update: vi.fn() },
  membership: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));

import { authenticateRequest } from "@/lib/api-auth";
import { resolveApiKey } from "@/lib/services/api-keys";
import { isEmailDisabled, isUserActive } from "@/lib/user-status";

const keyFor = (disabled: boolean) => ({
  id: "k1",
  teamId: "t1",
  createdById: "u1",
  role: "ADMIN",
  team: { id: "t1" },
  createdBy: { id: "u1", disabled },
});

function request(token = "verk_" + "a".repeat(40)) {
  return new Request("http://localhost/api/x", {
    headers: { authorization: `Bearer ${token}` },
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.apiKey.update.mockResolvedValue({});
  db.membership.findUnique.mockResolvedValue({ role: "ADMIN" });
});

describe("isUserActive", () => {
  it("is true only for an existing, enabled user", async () => {
    db.user.findUnique.mockResolvedValueOnce({ disabled: false });
    await expect(isUserActive("u1")).resolves.toBe(true);

    db.user.findUnique.mockResolvedValueOnce({ disabled: true });
    await expect(isUserActive("u1")).resolves.toBe(false);

    db.user.findUnique.mockResolvedValueOnce(null);
    await expect(isUserActive("gone")).resolves.toBe(false);
  });
});

describe("isEmailDisabled", () => {
  it("blocks only known disabled accounts, so first-time sign-up still works", async () => {
    db.user.findUnique.mockResolvedValueOnce({ disabled: true });
    await expect(isEmailDisabled("Gone@Example.com")).resolves.toBe(true);
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: "gone@example.com" },
      select: { disabled: true },
    });

    db.user.findUnique.mockResolvedValueOnce({ disabled: false });
    await expect(isEmailDisabled("ok@example.com")).resolves.toBe(false);

    db.user.findUnique.mockResolvedValueOnce(null);
    await expect(isEmailDisabled("new@example.com")).resolves.toBe(false);

    await expect(isEmailDisabled(null)).resolves.toBe(false);
  });
});

describe("API keys of disabled users", () => {
  it("resolveApiKey rejects a key whose creator is disabled", async () => {
    db.apiKey.findFirst.mockResolvedValue(keyFor(true));

    await expect(resolveApiKey("verk_" + "a".repeat(40))).resolves.toBeNull();
    expect(db.apiKey.update).not.toHaveBeenCalled();
  });

  it("resolveApiKey accepts a key whose creator is active", async () => {
    db.apiKey.findFirst.mockResolvedValue(keyFor(false));

    await expect(
      resolveApiKey("verk_" + "a".repeat(40)),
    ).resolves.toMatchObject({ id: "k1" });
    expect(db.apiKey.update).toHaveBeenCalledTimes(1);
  });

  it("authenticateRequest rejects a bearer key whose creator is disabled", async () => {
    db.apiKey.findFirst.mockResolvedValue(keyFor(true));

    await expect(authenticateRequest(request(), "t1")).rejects.toMatchObject({
      status: 401,
    });
    expect(db.apiKey.update).not.toHaveBeenCalled();
  });

  it("authenticateRequest accepts a bearer key whose creator is active", async () => {
    db.apiKey.findFirst.mockResolvedValue(keyFor(false));

    await expect(authenticateRequest(request(), "t1")).resolves.toMatchObject({
      type: "apiKey",
    });
  });
});