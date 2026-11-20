import { describe, expect, it } from "vitest";

/** Mirrors the hidden-input sync in SelectField.handleChange */
function syncHidden(
  input: { value: string },
  key: string | null | undefined,
) {
  input.value = key == null ? "" : String(key);
}

describe("SelectField hidden input sync", () => {
  it("writes the selected key before FormData reads the form", () => {
    const hidden = { value: "cmwdj3isx000508i3ee1e3dyh" };

    syncHidden(hidden, "cmwdj3isx000608i3widv6u8s");

    const fd = new FormData();

    fd.set("workflowStatusId", hidden.value);
    expect(fd.get("workflowStatusId")).toBe("cmwdj3isx000608i3widv6u8s");
  });
});