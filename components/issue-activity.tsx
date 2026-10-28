"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  field: string;
  fromValue: string;
  toValue: string;
  createdAt: string;
  actor: { name: string | null; email: string };
};

export function IssueActivityList({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void fetch(`/api/teams/${teamId}/issues/${issueId}/activity`, {
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRows(data?.activity ?? []));
  }, [teamId, issueId]);

  if (!rows.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Activity</h2>
      <ul className="mt-2 space-y-1 text-xs text-muted">
        {rows.map((row) => (
          <li key={row.id}>
            {row.actor.name ?? row.actor.email} changed {row.field} from{" "}
            {row.fromValue || "empty"} to {row.toValue || "empty"}
          </li>
        ))}
      </ul>
    </section>
  );
}
