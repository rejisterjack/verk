import { NextResponse } from "next/server";

import { rateLimitShared } from "@/lib/rate-limit";

export const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
export const SCIM_GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
export const SCIM_ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";
export const SCIM_PATCH_SCHEMA =
  "urn:ietf:params:scim:api:messages:2.0:PatchOp";

const SCIM_CONTENT_TYPE = "application/scim+json";

/** SCIM clients (Okta, Entra) expect `application/scim+json` bodies. */
export function scimJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": SCIM_CONTENT_TYPE },
  });
}

/** RFC 7644 error body. `status` is a string inside the body, and a number on the response. */
export function scimError(status: number, detail: string, scimType?: string) {
  return scimJson(
    {
      schemas: [SCIM_ERROR_SCHEMA],
      status: String(status),
      detail,
      ...(scimType ? { scimType } : {}),
    },
    status,
  );
}

/** Constant-time-ish bearer check against SCIM_TOKEN. No token configured means SCIM is off. */
export function scimAuthorized(request: Request) {
  const token = process.env.SCIM_TOKEN;

  if (!token) return false;

  return (request.headers.get("authorization") ?? "") === `Bearer ${token}`;
}

/**
 * The guard every SCIM handler runs first: shared rate limit, then bearer auth.
 * Returns a Response to send back, or null to continue.
 */
export async function scimGuard(request: Request): Promise<Response | null> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`scim:${ip}`)).ok) {
    return scimError(429, "Too many requests");
  }
  if (!scimAuthorized(request)) return scimError(401, "Unauthorized");

  return null;
}

export function userResource(user: {
  id: string;
  email: string;
  name: string | null;
  disabled: boolean;
  externalId?: string | null;
}) {
  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    externalId: user.externalId ?? undefined,
    userName: user.email,
    name: { formatted: user.name ?? user.email },
    active: !user.disabled,
  };
}

export type GroupMember = { id: string; email: string };

/** A Verk team is a SCIM group. `id` is the team id, `externalId` the team slug. */
export function groupResource(
  team: { id: string; name: string; slug: string },
  members?: GroupMember[],
) {
  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: team.id,
    displayName: team.name,
    externalId: team.slug,
    ...(members
      ? { members: members.map((m) => ({ value: m.id, display: m.email })) }
      : {}),
  };
}

export type MemberRef = { id?: string; email?: string };

/** A `members` entry as an IdP sends it. */
export type RawGroupMember = { value?: string; display?: string };

export type GroupOperation =
  | { kind: "add"; members: MemberRef[] }
  | { kind: "remove"; members: MemberRef[] }
  | { kind: "replace"; members: MemberRef[] };

type RawOperation = { op?: string; path?: string; value?: unknown };

/** A SCIM member value is a user id; older Verk clients sent an email. Accept both. */
function toRef(value: unknown): MemberRef | null {
  if (typeof value === "string") {
    return value.includes("@") ? { email: value.toLowerCase() } : { id: value };
  }
  if (value && typeof value === "object") {
    const record = value as { value?: unknown; display?: unknown };
    const inner = typeof record.value === "string" ? record.value : null;

    if (inner)
      return inner.includes("@")
        ? { email: inner.toLowerCase() }
        : { id: inner };
    if (typeof record.display === "string" && record.display.includes("@")) {
      return { email: record.display.toLowerCase() };
    }
  }

  return null;
}

function refsFrom(value: unknown): MemberRef[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];

  return list.map(toRef).filter((ref): ref is MemberRef => Boolean(ref));
}

/**
 * Parse RFC 7644 PATCH operations on a group's `members`.
 *   add     path "members"                      value [{value: id}]
 *   remove  path 'members[value eq "<id>"]'     (no value)
 *   remove  path "members"                      value [{value: id}]   (Okta style)
 *   replace path "members"                      value [{value: id}]
 * An Entra/Okta op with no path puts `members` inside the value object.
 */
export function parseGroupOperations(operations: RawOperation[] | undefined): {
  ops: GroupOperation[];
  error?: string;
} {
  const ops: GroupOperation[] = [];

  for (const operation of operations ?? []) {
    const verb = operation.op?.toLowerCase();

    if (verb !== "add" && verb !== "remove" && verb !== "replace") {
      return { ops: [], error: `Unsupported op "${operation.op ?? ""}"` };
    }
    const path = operation.path?.trim() ?? "";
    const filtered = path.match(/^members\[value\s+eq\s+"([^"]+)"\]$/i);

    if (filtered) {
      if (verb !== "remove") {
        return { ops: [], error: "A members filter is only valid with remove" };
      }
      const ref = toRef(filtered[1]);

      if (ref) ops.push({ kind: "remove", members: [ref] });
      continue;
    }

    let value = operation.value;

    if (!path && value && typeof value === "object" && !Array.isArray(value)) {
      value = (value as { members?: unknown }).members;
    } else if (path && path.toLowerCase() !== "members") {
      // displayName / externalId changes are not supported: a team is renamed in Verk.
      continue;
    }
    ops.push({ kind: verb, members: refsFrom(value) });
  }

  return { ops };
}

/** The final member set after applying operations to the current one. Roles are not touched here. */
export function applyGroupOperations(
  current: Set<string>,
  ops: GroupOperation[],
  resolve: (ref: MemberRef) => string | null,
): Set<string> {
  let next = new Set(current);

  for (const op of ops) {
    const ids = op.members
      .map(resolve)
      .filter((id): id is string => Boolean(id));

    if (op.kind === "add") ids.forEach((id) => next.add(id));
    else if (op.kind === "remove") ids.forEach((id) => next.delete(id));
    else next = new Set(ids);
  }

  return next;
}
