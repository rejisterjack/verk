import NextLink from "next/link";
import { notFound } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { monthRange, shiftMonth } from "@/lib/dates";
import { serverTranslator } from "@/lib/server-locale";
import { requireTeamBySlug } from "@/lib/rbac";
import { calendarIssues } from "@/lib/services/planning";
import { issueKey } from "@/lib/utils";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }

  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date();
  const { start } = monthRange(Number.isNaN(from.getTime()) ? new Date() : from);
  const { issues } = await calendarIssues(
    teamCtx.team.id,
    teamCtx.user.id,
    start,
  );
  const prev = shiftMonth(start, -1);
  const next = shiftMonth(start, 1);
  const t = await serverTranslator();
  const label = start.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });
  const firstWeekday = start.getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) =>
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), index + 1)),
    ),
  ];

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <div className="flex gap-2 text-sm">
            <NextLink href={`/t/${teamSlug}/calendar?from=${dayKey(prev)}`}>Previous</NextLink>
            <NextLink href={`/t/${teamSlug}/calendar?from=${dayKey(next)}`}>Next</NextLink>
          </div>
        }
        description={`${t("issue.startDate")} · ${t("issue.dueDate")}`}
        title={`${t("calendar.title")} · ${label}`}
      />
      <div className="grid grid-cols-7 gap-px bg-separator p-px text-sm">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
          <div key={name} className="bg-surface px-2 py-1 text-[11px] text-muted">
            {name}
          </div>
        ))}
        {cells.map((day, index) => (
          <div key={day ? dayKey(day) : `pad-${index}`} className="min-h-24 bg-surface p-1">
            {day ? (
              <>
                <div className="text-[11px] text-muted">{day.getUTCDate()}</div>
                <ul className="space-y-1">
                  {issues
                    .filter((issue) => {
                      const key = dayKey(day);

                      return (
                        (issue.startDate && dayKey(issue.startDate) === key) ||
                        (issue.dueDate && dayKey(issue.dueDate) === key)
                      );
                    })
                    .map((issue) => (
                      <li key={issue.id}>
                        <NextLink
                          className="block truncate text-[12px]"
                          href={`/t/${issue.team.slug}/issues/${issue.id}`}
                        >
                          {issueKey(issue.team.slug, issue.number)} {issue.title}
                        </NextLink>
                      </li>
                    ))}
                </ul>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
