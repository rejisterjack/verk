/** GitHub usernames or numeric account ids allowed to use this host. Empty means open sign-up. */
export function githubAllowlist(): string[] | null {
  const raw = process.env.AUTH_ALLOWED_GITHUB?.trim();

  if (!raw) return null;

  const values = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return values.length > 0 ? values : null;
}

export function isPrivateHost(): boolean {
  return githubAllowlist() !== null;
}

export function isGithubIdentityAllowed(profile: unknown): boolean {
  const list = githubAllowlist();

  if (!list) return true;
  if (!profile || typeof profile !== "object") return false;

  const record = profile as { login?: unknown; id?: unknown };
  const login =
    typeof record.login === "string" ? record.login.toLowerCase() : "";
  const id = record.id == null ? "" : String(record.id).toLowerCase();

  return (login !== "" && list.includes(login)) || (id !== "" && list.includes(id));
}
