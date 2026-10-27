import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-separator px-6 py-16 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-muted max-w-md text-sm">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
