"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useT } from "@/components/locale-provider";
import {
  GROUP_OPTIONS,
  type GroupBy,
  SORT_OPTIONS,
  type SortBy,
} from "@/lib/list-display";

const selectClass =
  "h-7 rounded-md border border-separator bg-surface px-1.5 text-[12px] text-foreground";

/** Group and sort controls for the list. The choice lives in the URL, so it can be shared and saved in a view. */
export function IssuesDisplayMenu({
  groupBy,
  sortBy,
}: {
  groupBy: GroupBy;
  sortBy: SortBy;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useT();

  function set(name: "listGroup" | "listSort", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    const isDefault = value === "none" || value === "manual";

    if (isDefault) next.delete(name);
    else next.set(name, value);
    const query = next.toString();

    router.replace(`${pathname}${query ? `?${query}` : ""}`);
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <label className="inline-flex items-center gap-1">
        {t("display.group")}
        <select
          aria-label={t("display.group")}
          className={selectClass}
          value={groupBy}
          onChange={(event) => set("listGroup", event.target.value)}
        >
          {GROUP_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`group.${option}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex items-center gap-1">
        {t("display.sort")}
        <select
          aria-label={t("display.sort")}
          className={selectClass}
          value={sortBy}
          onChange={(event) => set("listSort", event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`sort.${option}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
