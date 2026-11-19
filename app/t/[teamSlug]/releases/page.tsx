import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";

import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import * as releases from "@/lib/services/releases";
import { issueKey } from "@/lib/utils";

const fieldClass =
  "mt-1 block h-8 rounded-md border border-separator bg-background px-2 text-[13px] text-foreground";

export default async function ReleasesPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const teamId = teamCtx.team.id;
  const canEdit = teamCtx.membership.role !== "GUEST";
  const [list, pipelines] = await Promise.all([
    releases.listReleases(teamId),
    releases.ensurePipelines(teamId),
  ]);
  const back = `/t/${teamSlug}/releases`;

  async function createPipeline(formData: FormData) {
    "use server";
    await requireTeamBySlug(teamSlug);
    await releases.createPipeline(teamId, String(formData.get("name") ?? ""));
    redirect(back);
  }

  async function create(formData: FormData) {
    "use server";
    await requireTeamBySlug(teamSlug);
    const name = String(formData.get("name") ?? "").trim();
    const date = String(formData.get("targetDate") ?? "");

    if (!name) return;
    await releases.createRelease(teamId, {
      name,
      targetDate: date || null,
      pipelineId: String(formData.get("pipelineId") ?? "") || undefined,
    });
    redirect(back);
  }

  async function setStage(formData: FormData) {
    "use server";
    await requireTeamBySlug(teamSlug);
    await releases.updateRelease(teamId, String(formData.get("releaseId")), {
      stageId: String(formData.get("stageId") ?? ""),
    });
    redirect(back);
  }

  async function addStage(formData: FormData) {
    "use server";
    await requireTeamBySlug(teamSlug);
    await releases.addPipelineStage(
      teamId,
      String(formData.get("pipelineId") ?? ""),
      String(formData.get("name") ?? ""),
    );
    redirect(back);
  }

  async function renameStage(formData: FormData) {
    "use server";
    await requireTeamBySlug(teamSlug);
    await releases.renamePipelineStage(
      teamId,
      String(formData.get("stageId") ?? ""),
      String(formData.get("name") ?? ""),
    );
    redirect(back);
  }

  async function removeStage(formData: FormData) {
    "use server";
    await requireTeamBySlug(teamSlug);
    await releases.deletePipelineStage(
      teamId,
      String(formData.get("stageId") ?? ""),
    );
    redirect(back);
  }

  async function moveStage(formData: FormData) {
    "use server";
    await requireTeamBySlug(teamSlug);
    await releases.movePipelineStage(
      teamId,
      String(formData.get("stageId") ?? ""),
      formData.get("direction") === "up" ? "up" : "down",
    );
    redirect(back);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Group issues into a release and move them through a pipeline."
        title="Releases"
      />
      {canEdit ? (
        <>
          <form
            action={createPipeline}
            className="flex flex-wrap items-end gap-2 border-b border-separator px-4 py-3"
          >
            <label className="text-[12px] text-muted">
              New pipeline
              <input required className={fieldClass} name="name" />
            </label>
            <Button size="sm" type="submit" variant="tertiary">
              Add pipeline
            </Button>
          </form>
          <form
            action={create}
            className="flex flex-wrap items-end gap-2 border-b border-separator px-4 py-3"
          >
            <label className="text-[12px] text-muted">
              Name
              <input required className={fieldClass} name="name" />
            </label>
            <label className="text-[12px] text-muted">
              Target
              <input className={fieldClass} name="targetDate" type="date" />
            </label>
            <label className="text-[12px] text-muted">
              Pipeline
              <select className={fieldClass} name="pipelineId">
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" type="submit">
              Add release
            </Button>
          </form>
        </>
      ) : null}
      <section className="border-b border-separator px-4 py-3">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted">
          Pipelines
        </h2>
        <div className="mt-2 space-y-4">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id}>
              <p className="text-[13px] font-medium">{pipeline.name}</p>
              <ul className="mt-1 space-y-1 text-[13px]">
                {pipeline.stages.map((stage) => (
                  <li
                    key={stage.id}
                    className="flex flex-wrap items-center gap-2"
                  >
                    {canEdit ? (
                      <form
                        action={renameStage}
                        className="flex items-center gap-1"
                      >
                        <input name="stageId" type="hidden" value={stage.id} />
                        <input
                          aria-label={`Rename ${stage.name}`}
                          className="h-7 w-36 rounded-md border border-separator bg-background px-2 text-[12px]"
                          defaultValue={stage.name}
                          name="name"
                        />
                        <button
                          className="text-[12px] text-muted"
                          type="submit"
                        >
                          Rename
                        </button>
                      </form>
                    ) : (
                      <span>{stage.name}</span>
                    )}
                    {canEdit ? (
                      <>
                        {(["up", "down"] as const).map((direction) => (
                          <form key={direction} action={moveStage}>
                            <input
                              name="stageId"
                              type="hidden"
                              value={stage.id}
                            />
                            <input
                              name="direction"
                              type="hidden"
                              value={direction}
                            />
                            <button
                              className="text-[12px] text-muted"
                              type="submit"
                            >
                              {direction === "up" ? "Up" : "Down"}
                            </button>
                          </form>
                        ))}
                        {pipeline.stages.length > 1 ? (
                          <form action={removeStage}>
                            <input
                              name="stageId"
                              type="hidden"
                              value={stage.id}
                            />
                            <button
                              className="text-[12px] text-danger"
                              type="submit"
                            >
                              Delete
                            </button>
                          </form>
                        ) : null}
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
              {canEdit ? (
                <form action={addStage} className="mt-2 flex items-end gap-2">
                  <input name="pipelineId" type="hidden" value={pipeline.id} />
                  <label className="text-[12px] text-muted">
                    New stage
                    <input required className={fieldClass} name="name" />
                  </label>
                  <Button size="sm" type="submit" variant="tertiary">
                    Add stage
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      {list.length === 0 ? (
        <p className="px-4 py-8 text-[13px] text-muted">No releases yet.</p>
      ) : (
        <ul className="divide-y divide-separator">
          {list.map((release) => {
            const stages =
              pipelines.find((pipeline) => pipeline.id === release.pipelineId)
                ?.stages ?? [];
            const firstStageId = stages[0]?.id;

            return (
              <li key={release.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium">{release.name}</p>
                    <p className="text-[12px] text-muted">
                      {release.pipeline?.name ?? "No pipeline"}
                      {release.stage ? ` · ${release.stage.name}` : ""}
                      {release.targetDate
                        ? ` · ${release.targetDate.toISOString().slice(0, 10)}`
                        : ""}
                      {` · ${release.issues.length} issues`}
                    </p>
                  </div>
                  {canEdit && stages.length ? (
                    <form action={setStage} className="flex items-center gap-2">
                      <input
                        name="releaseId"
                        type="hidden"
                        value={release.id}
                      />
                      <select
                        className="h-8 rounded-md border border-separator bg-background px-2 text-[12px]"
                        defaultValue={release.stageId ?? firstStageId}
                        name="stageId"
                      >
                        {stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" type="submit" variant="tertiary">
                        Save
                      </Button>
                    </form>
                  ) : null}
                </div>
                <ul className="mt-2 space-y-2 text-[13px]">
                  {stages.map((stage) => {
                    const rows = release.issues.filter(
                      (row) =>
                        row.stageId === stage.id ||
                        (!row.stageId && stage.id === firstStageId),
                    );

                    if (!rows.length) return null;

                    return (
                      <li key={stage.id}>
                        <p className="text-[11px] uppercase tracking-wide text-muted">
                          {stage.name}
                        </p>
                        <ul>
                          {rows.map((row) => (
                            <li key={row.issue.id}>
                              <NextLink
                                className="hover:text-accent"
                                href={`/t/${teamSlug}/issues/${row.issue.number}`}
                              >
                                <span className="font-mono text-[11px] text-muted">
                                  {issueKey(teamSlug, row.issue.number)}
                                </span>{" "}
                                {row.issue.title}
                              </NextLink>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
