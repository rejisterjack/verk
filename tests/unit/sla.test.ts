import { describe, expect, it } from "vitest";

import { slaBreached, withinSlaWindow } from "@/lib/sla";

const hours = { URGENT: 4, HIGH: 24 };
const created = new Date("2026-03-02T09:00:00Z"); // a Monday

describe("slaBreached", () => {
  it("is false until the target time has passed", () => {
    const early = new Date(created.getTime() + 3 * 3_600_000);
    const late = new Date(created.getTime() + 5 * 3_600_000);

    expect(slaBreached("URGENT", "TODO", created, hours, early)).toBe(false);
    expect(slaBreached("URGENT", "TODO", created, hours, late)).toBe(true);
  });

  it("ignores finished issues", () => {
    const late = new Date(created.getTime() + 100 * 3_600_000);

    expect(slaBreached("URGENT", "DONE", created, hours, late)).toBe(false);
    expect(slaBreached("URGENT", "CANCELLED", created, hours, late)).toBe(
      false,
    );
  });

  it("ignores priorities with no target and bad config", () => {
    const late = new Date(created.getTime() + 100 * 3_600_000);

    expect(slaBreached("LOW", "TODO", created, hours, late)).toBe(false);
    expect(slaBreached("URGENT", "TODO", created, null, late)).toBe(false);
    expect(slaBreached("URGENT", "TODO", created, [4], late)).toBe(false);
    expect(slaBreached("URGENT", "TODO", created, { URGENT: 0 }, late)).toBe(
      false,
    );
    expect(slaBreached("URGENT", "TODO", created, { URGENT: "4" }, late)).toBe(
      false,
    );
  });

  it("pauses outside the support window", () => {
    const saturday = new Date("2026-03-07T12:00:00Z");

    expect(
      slaBreached("URGENT", "TODO", created, hours, saturday, {
        weekdays: "1,2,3,4,5",
      }),
    ).toBe(false);
    expect(
      slaBreached("URGENT", "TODO", created, hours, saturday, {
        weekdays: "1,2,3,4,5,6,7",
      }),
    ).toBe(true);
  });
});

describe("withinSlaWindow", () => {
  it("defaults to weekdays, all day, UTC", () => {
    expect(withinSlaWindow(new Date("2026-03-02T03:00:00Z"), {})).toBe(true); // Mon
    expect(withinSlaWindow(new Date("2026-03-08T12:00:00Z"), {})).toBe(false); // Sun
  });

  it("applies start (inclusive) and end (exclusive) hours", () => {
    const opts = { startHour: 9, endHour: 17 };

    expect(withinSlaWindow(new Date("2026-03-02T08:59:00Z"), opts)).toBe(false);
    expect(withinSlaWindow(new Date("2026-03-02T09:00:00Z"), opts)).toBe(true);
    expect(withinSlaWindow(new Date("2026-03-02T16:59:00Z"), opts)).toBe(true);
    expect(withinSlaWindow(new Date("2026-03-02T17:00:00Z"), opts)).toBe(false);
  });

  it("reads the hour in the team's timezone", () => {
    // 03:30 UTC on Monday is 09:00 in Kolkata.
    const at = new Date("2026-03-02T03:30:00Z");

    expect(
      withinSlaWindow(at, { timezone: "Asia/Kolkata", startHour: 9, endHour: 17 }),
    ).toBe(true);
    expect(
      withinSlaWindow(at, { timezone: "UTC", startHour: 9, endHour: 17 }),
    ).toBe(false);
  });
});