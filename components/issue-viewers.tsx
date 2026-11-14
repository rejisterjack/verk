"use client";

import { useEffect, useState } from "react";

export function IssueViewers({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let stopped = false;

    async function beat() {
      const res = await fetch(
        `/api/teams/${teamId}/issues/${issueId}/presence`,
        { method: "POST", credentials: "same-origin" },
      );

      if (!res.ok || stopped) return;
      const data = (await res.json()) as { viewers?: { name: string }[] };

      setNames((data.viewers ?? []).map((viewer) => viewer.name));
    }

    void beat();
    const timer = window.setInterval(() => {
      void beat();
    }, 20000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [teamId, issueId]);

  if (!names.length) return null;

  return (
    <p className="text-[12px] text-muted">Also viewing: {names.join(", ")}</p>
  );
}
