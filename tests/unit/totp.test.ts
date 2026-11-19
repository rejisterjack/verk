import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  otpauthUri,
  totpAt,
  verifyTotp,
} from "@/lib/totp";

// RFC 6238 appendix B: the SHA-1 secret is the ASCII string "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("base32", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);

    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(
      Array.from(bytes),
    );
  });

  it("ignores spaces, dashes, padding and case", () => {
    const encoded = base32Encode(Buffer.from("hello world"));
    const messy = encoded.toLowerCase().replace(/(.{4})/g, "$1 ") + "==";

    expect(base32Decode(messy).toString()).toBe("hello world");
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => base32Decode("AB1!")).toThrow();
  });
});

describe("totp", () => {
  it("matches the RFC 6238 test vectors (last six digits)", () => {
    expect(totpAt(RFC_SECRET, 59_000)).toBe("287082");
    expect(totpAt(RFC_SECRET, 1_111_111_109_000)).toBe("081804");
    expect(totpAt(RFC_SECRET, 1_234_567_890_000)).toBe("005924");
  });

  it("accepts the current code and returns its step", () => {
    const now = 1_234_567_890_000;

    expect(verifyTotp(RFC_SECRET, "005924", now)).toBe(
      Math.floor(now / 30_000),
    );
  });

  it("allows one step of clock drift either way but not two", () => {
    const now = 1_234_567_890_000;
    const previous = totpAt(RFC_SECRET, now - 30_000);
    const next = totpAt(RFC_SECRET, now + 30_000);
    const tooOld = totpAt(RFC_SECRET, now - 90_000);

    expect(verifyTotp(RFC_SECRET, previous, now)).toBe(
      Math.floor(now / 30_000) - 1,
    );
    expect(verifyTotp(RFC_SECRET, next, now)).toBe(Math.floor(now / 30_000) + 1);
    expect(verifyTotp(RFC_SECRET, tooOld, now)).toBeNull();
  });

  it("returns a step so the caller can refuse a replay of the same one", () => {
    const now = 1_234_567_890_000;
    const first = verifyTotp(RFC_SECRET, "005924", now);
    const second = verifyTotp(RFC_SECRET, "005924", now + 5_000);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it("rejects malformed and wrong codes", () => {
    const now = 1_234_567_890_000;

    expect(verifyTotp(RFC_SECRET, "12345", now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abcdef", now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "000000", now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "", now)).toBeNull();
  });

  it("accepts a code typed with a space in the middle", () => {
    expect(verifyTotp(RFC_SECRET, "005 924", 1_234_567_890_000)).not.toBeNull();
  });

  it("generates 160-bit secrets that differ each time", () => {
    const a = generateSecret();
    const b = generateSecret();

    expect(a).not.toBe(b);
    expect(base32Decode(a)).toHaveLength(20);
  });

  it("builds an otpauth URI an authenticator can import", () => {
    const uri = otpauthUri("ABCDEFGH", "me@example.com");

    expect(uri.startsWith("otpauth://totp/Verk%3Ame%40example.com?")).toBe(true);
    expect(uri).toContain("secret=ABCDEFGH");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("recovery codes", () => {
  it("makes ten distinct codes in xxxxx-xxxxx form without look-alikes", () => {
    const codes = generateRecoveryCodes();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
      expect(code).not.toMatch(/[ilo01]/);
    }
  });

  it("hashes the same for any case, spacing or dash", () => {
    expect(hashRecoveryCode("ABCDE-23456")).toBe(
      hashRecoveryCode("abcde 23456"),
    );
    expect(normalizeRecoveryCode("AbC-De 23")).toBe("abcde23");
    expect(hashRecoveryCode("abcde-23456")).not.toBe(
      hashRecoveryCode("abcde-23457"),
    );
  });

  it("never stores the code itself", () => {
    expect(hashRecoveryCode("abcde-23456")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("secret encryption", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-for-2fa";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("round-trips a secret", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");

    expect(stored).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(stored)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("uses a fresh IV so equal secrets encrypt differently", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("fails when the ciphertext is tampered with", () => {
    const [iv, tag, data] = encryptSecret("JBSWY3DPEHPK3PXP").split(".");
    const flipped = Buffer.from(data!, "base64url");

    flipped[0] = flipped[0]! ^ 1;

    expect(() =>
      decryptSecret([iv, tag, flipped.toString("base64url")].join(".")),
    ).toThrow();
  });

  it("fails under a different AUTH_SECRET", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");

    process.env.AUTH_SECRET = "another-secret";
    expect(() => decryptSecret(stored)).toThrow();
  });

  it("refuses to run without AUTH_SECRET", () => {
    delete process.env.AUTH_SECRET;
    expect(() => encryptSecret("x")).toThrow(/AUTH_SECRET/);
  });

  it("rejects a malformed stored value", () => {
    expect(() => decryptSecret("not-a-secret")).toThrow();
  });
});