/**
 * Pure helpers for uploaded files: safe names, content sniffing, display. No I/O, so the upload
 * service, the UI and tests share them.
 */

export const MAX_ATTACHMENTS_PER_ISSUE = 25;

/**
 * A file name that is safe to put in a storage path and a download header: no directories, no
 * control characters, no leading dots, at most 120 characters, extension kept.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";

  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>:|?*]/g, "").trim();
  const noLeadingDots = cleaned.replace(/^\.+/, "");

  if (!noLeadingDots) return "file";
  if (noLeadingDots.length <= 120) return noLeadingDots;
  const dot = noLeadingDots.lastIndexOf(".");
  const ext = dot > 0 ? noLeadingDots.slice(dot).slice(0, 12) : "";

  return `${noLeadingDots.slice(0, 120 - ext.length)}${ext}`;
}

const SIGNATURES: { type: string; bytes: number[]; offset?: number }[] = [
  {
    type: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { type: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
];

/** The type implied by the first bytes of the file, or null when they match nothing we know. */
export function sniffType(head: Uint8Array): string | null {
  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;

    if (
      head.length >= offset + sig.bytes.length &&
      sig.bytes.every((byte, i) => head[offset + i] === byte)
    ) {
      return sig.type;
    }
  }
  // WebP is "RIFF" + 4 size bytes + "WEBP".
  if (
    head.length >= 12 &&
    [0x52, 0x49, 0x46, 0x46].every((b, i) => head[i] === b) &&
    [0x57, 0x45, 0x42, 0x50].every((b, i) => head[8 + i] === b)
  ) {
    return "image/webp";
  }

  return null;
}

const BINARY_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/zip",
]);

/**
 * Whether the bytes agree with the claimed type. Binary types must carry their signature (so a
 * script renamed to .png is refused). Text types must not contain NUL bytes.
 */
export function contentMatchesType(claimed: string, head: Uint8Array): boolean {
  if (BINARY_TYPES.has(claimed)) return sniffType(head) === claimed;
  if (claimed === "text/plain" || claimed === "text/markdown") {
    return !head.includes(0);
  }

  return false;
}

export function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
