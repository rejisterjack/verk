const CLOSED = new Set(["DONE", "CANCELLED"]);

export type SlaWindow = {
  timezone?: string;
  startHour?: number;
  endHour?: number;
  weekdays?: string;
};

export function withinSlaWindow(
  now: Date,
  opts: { timezone?: string; startHour?: number; endHour?: number; weekdays?: string },
): boolean {
  const timeZone = opts.timezone || "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const dayIndex: Record<string, string> = {
    Mon: "1",
    Tue: "2",
    Wed: "3",
    Thu: "4",
    Fri: "5",
    Sat: "6",
    Sun: "7",
  };
  const allowed = (opts.weekdays || "1,2,3,4,5").split(",");
  const start = opts.startHour ?? 0;
  const end = opts.endHour ?? 24;

  return allowed.includes(dayIndex[weekday] ?? "1") && hour >= start && hour < end;
}

export function slaBreached(
  priority: string,
  status: string,
  createdAt: Date,
  slaHours: unknown,
  now = new Date(),
  window?: SlaWindow,
): boolean {
  if (CLOSED.has(status)) return false;
  if (window && !withinSlaWindow(now, window)) return false;
  if (!slaHours || typeof slaHours !== "object" || Array.isArray(slaHours)) {
    return false;
  }
  const hours = (slaHours as Record<string, unknown>)[priority];

  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
    return false;
  }

  return now.getTime() - createdAt.getTime() > hours * 3_600_000;
}
