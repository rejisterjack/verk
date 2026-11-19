/**
 * Smoke-test the SCIM Users and Groups lifecycle against a running server.
 *
 * Usage:
 *   VERK_BASE_URL=http://localhost:3000 SCIM_TOKEN=... SCIM_TEAM_NAME="Acme Engineering" npm run scim:smoke
 *
 * SCIM_TEAM_NAME (or its slug) must name an EXISTING Verk team: SCIM links to
 * teams, it never creates them. The script provisions a throwaway user, walks it
 * through add / remove / replace / deactivate, and always cleans up.
 */

export {};

const baseUrl = (process.env.VERK_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const token = process.env.SCIM_TOKEN;
const teamName = process.env.SCIM_TEAM_NAME ?? "acme-engineering";

if (!token) {
  console.error("Set SCIM_TOKEN");
  process.exit(1);
}

let failures = 0;

async function scim(method: string, path: string, body?: unknown) {
  const res = await fetch(`${baseUrl}/api/scim${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/scim+json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();

  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    failures += 1;
    if (detail !== undefined) console.log("      ", JSON.stringify(detail).slice(0, 300));
  }
}

const members = (group: { members?: { value: string }[] }) =>
  (group.members ?? []).map((member) => member.value);

const stamp = Date.now().toString(36);
const email = `scim-smoke-${stamp}@example.com`;
let userId = "";
let groupId = "";

try {
  const config = await scim("GET", "/ServiceProviderConfig");

  check("ServiceProviderConfig advertises PATCH", config.json?.patch?.supported === true, config);
  const types = await scim("GET", "/ResourceTypes");

  check("ResourceTypes lists User and Group", types.json?.totalResults === 2, types);

  const unauthorised = await fetch(`${baseUrl}/api/scim/Groups`);

  check("a request without the token is 401", unauthorised.status === 401);

  const found = await scim(
    "GET",
    `/Groups?filter=${encodeURIComponent(`displayName eq "${teamName}"`)}`,
  );

  groupId = found.json?.Resources?.[0]?.id ?? "";
  check(`GET /Groups filter finds team "${teamName}"`, Boolean(groupId), found);
  if (!groupId) throw new Error("No team to test against. Set SCIM_TEAM_NAME.");

  const created = await scim("POST", "/Users", { userName: email, name: { formatted: "SCIM Smoke" } });

  userId = created.json?.id ?? "";
  check("POST /Users with no teamId creates the user", created.status === 201 && Boolean(userId), created);

  const lookedUp = await scim("GET", `/Users?filter=${encodeURIComponent(`userName eq "${email}"`)}`);

  check("GET /Users filter finds the new user by userName", lookedUp.json?.totalResults === 1, lookedUp);

  const added = await scim("PATCH", `/Groups/${groupId}`, {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    Operations: [{ op: "add", path: "members", value: [{ value: userId }] }],
  });

  check("PATCH add puts the user in the group", added.status === 200 && members(added.json).includes(userId), added);

  const fetched = await scim("GET", `/Groups/${groupId}`);

  check("GET /Groups/{id} lists the member by user id", members(fetched.json).includes(userId), fetched);

  const removed = await scim("PATCH", `/Groups/${groupId}`, {
    Operations: [{ op: "remove", path: `members[value eq "${userId}"]` }],
  });

  check("PATCH remove (filtered path) takes the user out", !members(removed.json).includes(userId), removed);

  const owners = members(removed.json).length;

  await scim("PATCH", `/Groups/${groupId}`, {
    Operations: [{ op: "replace", path: "members", value: [{ value: userId }] }],
  });
  const replaced = await scim("GET", `/Groups/${groupId}`);

  check("PATCH replace sets the member list", members(replaced.json).includes(userId), replaced);
  check("OWNERs survive a replace", members(replaced.json).length >= Math.max(1, owners), replaced);

  const disabled = await scim("PATCH", `/Users/${userId}`, {
    Operations: [{ op: "replace", path: "active", value: false }],
  });

  check("PATCH active:false deactivates the user", disabled.json?.active === false, disabled);

  const missing = await scim("GET", "/Groups/does-not-exist");

  check("an unknown group is a SCIM 404", missing.status === 404 && missing.json?.status === "404", missing);
} catch (error) {
  failures += 1;
  console.error("FAIL ", error instanceof Error ? error.message : error);
} finally {
  // Take the throwaway user back out of the group and deactivate it.
  if (groupId && userId) {
    await scim("PATCH", `/Groups/${groupId}`, {
      Operations: [{ op: "remove", path: `members[value eq "${userId}"]` }],
    }).catch(() => undefined);
  }
  if (userId) await scim("DELETE", `/Users/${userId}`).catch(() => undefined);
}

console.log(failures ? `\nSCIM smoke FAILED (${failures})` : "\nSCIM smoke passed");
process.exit(failures ? 1 : 0);