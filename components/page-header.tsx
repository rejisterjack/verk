import type { ReactNode } from "react";

import clsx from "clsx";

/** Linear-style compact sticky view chrome. Prefer this over large page titles. */
export function ViewToolbar({
  title,
  description,
  actions,
  filters,
  className,
  sticky = true,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={clsx(
        "border-b border-separator bg-background/90 backdrop-blur-sm",
        sticky && "sticky top-0 z-20",
        className,
      )}
    >
      <div className="flex min-h-[var(--toolbar-h)] items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="truncate text-[12px] text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {actions}
          </div>
        ) : null}
      </div>
      {filters ? (
        <div
          data-view-filters
          className="flex flex-wrap items-center gap-1.5 border-t border-separator/70 px-4 py-1.5"
        >
          {filters}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer ViewToolbar — kept for gradual migration. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <ViewToolbar
      actions={actions}
      className="mb-0"
      description={description}
      sticky={false}
      title={title}
    />
  );
}
