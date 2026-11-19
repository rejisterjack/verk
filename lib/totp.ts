/**
 * Time-based one-time passwords (RFC 6238) with SHA-1, 6 digits, 30-second steps: what Google
 * Authenticator, 1Password, Authy and friends all speak. Built on Node's crypto, no dependency.
 *
 * Secrets are stored encrypted (see `encryptSecret`), recovery codes only as hashes.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const STEP_SECONDS = 30;
const DIGITS = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];

  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const char of clean) {
    const index = ALPHABET.indexOf(char);

    if (index === -1) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(out);
}

/** A fresh 160-bit secret, base32 encoded (what authenticator apps expect). */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);

  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buffer).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    (hmac[offset + 1]! << 16) |
    (hmac[offset + 2]! << 8) |
    hmac[offset + 3]!;

  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totpAt(secretBase32: string, atMs: number): string {
  return hotp(
    base32Decode(secretBase32),
    Math.floor(atMs / 1000 / STEP_SECONDS),
  );
}

/**
 * Check a submitted code, allowing one step either side for clock drift. Returns the time step
 * that matched (so the caller can refuse to accept the same step twice) or null.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  nowMs: number = Date.now(),
  window = 1,
): number | null {
  const submitted = code.replace(/\s/g, "");

  if (!/^\d{6}$/.test(submitted)) return null;
  const secret = base32Decode(secretBase32);
  const step = Math.floor(nowMs / 1000 / STEP_SECONDS);

  for (let drift = -window; drift <= window; drift += 1) {
    const expected = hotp(secret, step + drift);

    if (
      timingSafeEqual(Buffer.from(expected), Buffer.from(submitted)) &&
      step + drift >= 0
    ) {
      return step + drift;
    }
  }

  return null;
}

/** The `otpauth://` URI an authenticator app imports (shown as text; no QR dependency). */
export function otpauthUri(
  secretBase32: string,
  account: string,
  issuer = "Verk",
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Groups of four for easy reading: `ABCD EFGH IJKL ...`. */
export function formatSecret(secretBase32: string): string {
  return secretBase32.match(/.{1,4}/g)?.join(" ") ?? secretBase32;
}

// ---- recovery codes -----------------------------------------------------------------------

const RECOVERY_COUNT = 10;
const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes

export function generateRecoveryCodes(count = RECOVERY_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10);
    const chars = Array.from(
      bytes,
      (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length],
    ).join("");

    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

/** Codes are compared as hashes, ignoring case, spaces and the dash. */
export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

// ---- secret encryption --------------------------------------------------------------------

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;

  if (!secret)
    throw new Error("AUTH_SECRET is required to protect 2FA secrets");

  return createHash("sha256").update(`verk:totp:${secret}`).digest();
}

/** AES-256-GCM: `iv.tag.ciphertext`, all base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));

  if (!iv || !tag || !data) throw new Error("Malformed 2FA secret");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
