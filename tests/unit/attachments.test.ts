import { describe, expect, it } from "vitest";

import {
  ALLOWED_ATTACHMENT_TYPES,
  assertAttachmentFile,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/services/attachments";
import { AuthError } from "@/lib/errors";

describe("assertAttachmentFile", () => {
  it("rejects uploads when the blob token is missing", () => {
    const previous = process.env.BLOB_READ_WRITE_TOKEN;

    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(() =>
      assertAttachmentFile({ size: 10, type: "image/png" }),
    ).toThrow(AuthError);
    process.env.BLOB_READ_WRITE_TOKEN = previous;
  });

  it("rejects oversize and disallowed types", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token";
    expect(() =>
      assertAttachmentFile({
        size: MAX_ATTACHMENT_BYTES + 1,
        type: "image/png",
      }),
    ).toThrow(/10 MB/);
    expect(() =>
      assertAttachmentFile({ size: 10, type: "application/x-msdownload" }),
    ).toThrow(/not allowed/);
    expect(() =>
      assertAttachmentFile({ size: 10, type: "image/png" }),
    ).not.toThrow();
    expect(ALLOWED_ATTACHMENT_TYPES.has("application/pdf")).toBe(true);
  });
});
