"use client";

import type { Key } from "@heroui/react";

import { useEffect, useMemo, useState } from "react";

import { SelectField } from "@/components/ui/select-field";

type Stage = { id: string; name: string };
type Pipeline = { id: string; name: string; stages: Stage[] };
type ReleaseOption = {
  id: string;
  name: string;
  pipelineId: string | null;
};

export function IssueReleaseField({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [releases, setReleases] = useState<ReleaseOption[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(
        `/api/teams/${teamId}/releases?issueId=${issueId}`,
        {
          credentials: "same-origin",
        },
      );

      if (!res.ok) return;
      const data = await res.json();

      setReleases(data.releases ?? []);
      setPipelines(data.pipelines ?? []);
      setReleaseId(data.selectedId ?? null);
      setStageId(data.stageId ?? null);
    })();
  }, [teamId, issueId]);

  // Only the chosen release's own pipeline stages are valid for this issue.
  const stages = useMemo(() => {
    const release = releases.find((item) => item.id === releaseId);

    return (
      pipelines.find((pipeline) => pipeline.id === release?.pipelineId)
        ?.stages ?? []
    );
  }, [pipelines, releases, releaseId]);

  async function save(nextRelease: string | null, nextStage: string | null) {
    const res = await fetch(`/api/teams/${teamId}/releases`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId,
        releaseId: nextRelease,
        stageId: nextStage,
      }),
    });

    if (!res.ok) return;
    const data = (await res.json()) as {
      selected: { releaseId: string; stageId: string | null } | null;
    };

    setReleaseId(data.selected?.releaseId ?? null);
    setStageId(data.selected?.stageId ?? null);
  }

  return (
    <>
      <SelectField
        clearable
        label="Release"
        options={releases.map((release) => ({
          id: release.id,
          label: release.name,
        }))}
        placeholder="No release"
        value={releaseId}
        onChange={(key: Key | null) =>
          // Changing release resets the stage to that pipeline's first stage.
          void save(key ? String(key) : null, null)
        }
      />
      {releaseId ? (
        <SelectField
          label="Pipeline stage"
          options={stages.map((stage) => ({ id: stage.id, label: stage.name }))}
          placeholder="Stage"
          value={stageId}
          onChange={(key: Key | null) =>
            void save(releaseId, key ? String(key) : null)
          }
        />
      ) : null}
    </>
  );
}
