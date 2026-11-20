import NextLink from "next/link";
import { notFound } from "next/navigation";

import {
  CreateDocumentForm,
  UpdateDocumentForm,
} from "@/components/docs-forms";
import { MarkdownBody } from "@/components/markdown-body";
import { EmptyState } from "@/components/empty-state";
import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import {
  addDocumentCommentAction,
  deleteDocumentAction,
} from "@/lib/actions/documents";
import { requireTeamBySlug } from "@/lib/rbac";
import * as projectsService from "@/lib/services/projects";
import { listDocuments } from "@/lib/services/surface";

export default async function TeamDocsPage({
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
  const [docs, projects, initiatives] = await Promise.all([
    listDocuments(teamCtx.team.id),
    projectsService.listProjects(teamCtx.team.id),
    projectsService.listInitiatives(teamCtx.team.id),
  ]);
  const projectName = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const initiativeName = new Map(
    initiatives.map((initiative) => [initiative.id, initiative.name]),
  );

  const linkOptions = {
    projects: projects.map((item) => ({ id: item.id, name: item.name })),
    initiatives: initiatives.map((item) => ({ id: item.id, name: item.name })),
  };

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar title="Documents" />
      {teamCtx.membership.role !== "GUEST" ? (
        <div className="border-b border-separator px-4 py-3">
          <CreateDocumentForm
            initiatives={linkOptions.initiatives}
            projects={linkOptions.projects}
            teamSlug={teamSlug}
          />
        </div>
      ) : null}
      {docs.length === 0 ? (
        <EmptyState
          description="Capture specs, notes, and decisions for the team."
          title="No documents yet"
        />
      ) : (
        <ul className="divide-y divide-separator">
          {docs.map((doc) => (
            <li key={doc.id} className="px-4 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight">
                {doc.title}
              </h2>
              {doc.projectId || doc.initiativeId ? (
                <p className="mt-1 text-[12px] text-muted">
                  {doc.projectId
                    ? `Project: ${projectName.get(doc.projectId) ?? "Project"}`
                    : null}
                  {doc.projectId && doc.initiativeId ? " · " : null}
                  {doc.initiativeId
                    ? `Initiative: ${initiativeName.get(doc.initiativeId) ?? "Initiative"}`
                    : null}
                </p>
              ) : null}
              <div className="mt-2 text-[13px]">
                <MarkdownBody text={doc.body} />
              </div>
              <ul className="mt-3 space-y-2 text-[13px]">
                {doc.comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-md border border-separator px-3 py-2"
                  >
                    <p className="text-[11px] text-muted">
                      {comment.author.name ?? comment.author.email}
                    </p>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                  </li>
                ))}
              </ul>
              {teamCtx.membership.role !== "GUEST" ? (
                <form action={addDocumentCommentAction} className="mt-2 flex items-end gap-2">
                  <input name="teamSlug" type="hidden" value={teamSlug} />
                  <input name="documentId" type="hidden" value={doc.id} />
                  <label className="min-w-0 flex-1 text-[12px] text-muted">
                    Comment
                    <input
                      required
                      className="mt-1 block h-8 w-full rounded-md border border-separator bg-background px-2 text-[13px] text-foreground"
                      name="body"
                    />
                  </label>
                  <Button size="sm" type="submit" variant="tertiary">
                    Comment
                  </Button>
                </form>
              ) : null}
              <NextLink
                className="mt-3 inline-block text-[12px] text-accent hover:underline"
                href={`/t/${teamSlug}/docs/${doc.id}/history`}
              >
                Version history
              </NextLink>
              {teamCtx.membership.role !== "GUEST" ? (
                <div className="mt-3 space-y-2">
                  <UpdateDocumentForm
                    body={doc.body}
                    documentId={doc.id}
                    initiativeId={doc.initiativeId}
                    initiatives={linkOptions.initiatives}
                    projectId={doc.projectId}
                    projects={linkOptions.projects}
                    teamSlug={teamSlug}
                    title={doc.title}
                  />
                  <form action={deleteDocumentAction}>
                    <input name="documentId" type="hidden" value={doc.id} />
                    <input name="teamSlug" type="hidden" value={teamSlug} />
                    <Button size="sm" type="submit" variant="danger">
                      Delete
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}