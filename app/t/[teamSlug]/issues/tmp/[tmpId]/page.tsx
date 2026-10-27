"use client";

import type { LocalIssue } from "@/lib/offline/db";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { IssueEditor } from "@/components/issue-editor";
import { getLocalIssue, subscribeIssues } from "@/lib/offline/issue-repository";

export default function TmpIssuePage() {
  const params = useParams<{ teamSlug: string; tmpId: string }>();
  const [issue, setIssue] = useState<LocalIssue | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      // Resolve teamId from cached teams by slug
      const { getOfflineDb } = await import("@/lib/offline/db");
      const db = getOfflineDb();
      const team = await db.teams.where("slug").equals(params.teamSlug).first();

      if (!team) return;
      setTeamId(team.id);
      const local = await getLocalIssue(team.id, params.tmpId);

      setIssue(local ?? null);
    };

    void load();
    const unsub = subscribeIssues(() => void load());

    return unsub;
  }, [params.teamSlug, params.tmpId]);

  if (!issue || !teamId) {
    return (
      <p className="text-sm text-muted">
        Provisional issue not found in local cache. Open the board while online
        first, or wait for sync.
      </p>
    );
  }

  return (
    <IssueEditor
      canDelete
      cycles={[]}
      initialIssue={{
        id: issue.id,
        number: issue.number,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        assigneeId: issue.assigneeId,
        cycleId: issue.cycleId,
        revision: issue.revision,
      }}
      members={[]}
      teamId={teamId}
      teamSlug={params.teamSlug}
      tmpId={issue.id}
    />
  );
}
