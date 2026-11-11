import { notFound, redirect } from "next/navigation";

import {
  CreateDocumentForm,
  UpdateDocumentForm,
} from "@/components/docs-forms";
import { MarkdownBody } from "@/components/markdown-body";
import { EmptyState } from "@/components/empty-state";
import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import {
  deleteDocument,
  listDocuments,
  saveDocument,
} from "@/lib/services/surface";

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
  const docs = await listDocuments(teamCtx.team.id);
  const userId = teamCtx.user.id;
  const teamId = teamCtx.team.id;

  async function create(formData: FormData) {
    "use server";
    await saveDocument(teamId, userId, {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
    redirect(`/t/${teamSlug}/docs`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar title="Documents" />
      {teamCtx.membership.role !== "GUEST" ? (
        <div className="border-b border-separator px-4 py-3">
          <CreateDocumentForm action={create} />
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
              <div className="mt-2 text-[13px]">
                <MarkdownBody text={doc.body} />
              </div>
              {teamCtx.membership.role !== "GUEST" ? (
                <div className="mt-3 space-y-2">
                  <UpdateDocumentForm
                    action={async (formData) => {
                      "use server";
                      await saveDocument(
                        teamId,
                        userId,
                        {
                          title: String(formData.get("title") ?? ""),
                          body: String(formData.get("body") ?? ""),
                        },
                        doc.id,
                      );
                      redirect(`/t/${teamSlug}/docs`);
                    }}
                    body={doc.body}
                    title={doc.title}
                  />
                  <form
                    action={async () => {
                      "use server";
                      await deleteDocument(teamId, doc.id);
                      redirect(`/t/${teamSlug}/docs`);
                    }}
                  >
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
