export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function issueKey(
  teamSlug: string,
  number: number | null | undefined,
): string {
  const prefix = teamSlug.slice(0, 3).toUpperCase() || "VRK";

  if (number == null) return `${prefix}-TMP`;

  return `${prefix}-${number}`;
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);

  crypto.getRandomValues(arr);

  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
