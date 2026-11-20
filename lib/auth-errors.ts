/** A cookie sealed with a previous AUTH_SECRET is not a session. It is not an application failure. */
export function isStaleSessionError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const record = error as { name?: unknown; message?: unknown; cause?: unknown };
  const name = typeof record.name === "string" ? record.name : "";
  const message = typeof record.message === "string" ? record.message : "";
  const cause =
    record.cause && typeof record.cause === "object"
      ? (record.cause as { message?: unknown }).message
      : "";
  const causeMessage = typeof cause === "string" ? cause : "";
  const text = `${name} ${message} ${causeMessage}`;

  return (
    name === "JWTSessionError" ||
    text.includes("no matching decryption secret")
  );
}
