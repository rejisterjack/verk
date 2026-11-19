import { describe, expect, it } from "vitest";

import { groupLabels } from "@/lib/labels";

describe("groupLabels", () => {
  it("groups named labels and leaves a flat list when nothing is grouped", () => {
    const flat = groupLabels([
      { id: "b", name: "bug", group: null },
      { id: "a", name: "api", group: "" },
    ]);

    expect(flat).toEqual([
      {
        name: "",
        labels: [
          { id: "a", name: "api", group: "" },
          { id: "b", name: "bug", group: null },
        ],
      },
    ]);

    const grouped = groupLabels([
      { id: "1", name: "zebra", group: "Area" },
      { id: "2", name: "alpha", group: "Area" },
      { id: "3", name: "loose", group: null },
      { id: "4", name: "beta", group: "Platform" },
    ]);

    expect(grouped.map((group) => group.name)).toEqual([
      "Area",
      "Platform",
      "Ungrouped",
    ]);
    expect(grouped[0]?.labels.map((label) => label.name)).toEqual([
      "alpha",
      "zebra",
    ]);
  });
});
