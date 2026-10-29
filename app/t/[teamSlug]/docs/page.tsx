import { notFound, redirect } from "next/navigation";

import { MarkdownBody } from "@/components/markdown-body";
import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import { deleteDocument, listDocuments, saveDocument } from "@/lib/services/surface";

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
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Documents" />
      {teamCtx.membership.role !== "GUEST" ? (
        <form action={create} className="space-y-2">
          <input
            required
            className="w-full rounded-lg border border-separator px-3 py-2 text-sm"
            name="title"
            placeholder="Title"
          />
          <textarea
            className="min-h-24 w-full rounded-lg border border-separator px-3 py-2 text-sm"
            name="body"
            placeholder="Markdown"
          />
          <Button type="submit">Save document</Button>
        </form>
      ) : null}
      {docs.map((doc) => (
        <article key={doc.id} className="rounded-xl border border-separator p-4">
          <h2 className="font-medium">{doc.title}</h2>
          <MarkdownBody text={doc.body} />
          {teamCtx.membership.role !== "GUEST" ? (
            <form
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
              className="mt-3 space-y-2"
            >
              <input className="w-full rounded border border-separator px-2 py-1 text-sm" defaultValue={doc.title} name="title" required />
              <textarea className="min-h-20 w-full rounded border border-separator px-2 py-1 text-sm" defaultValue={doc.body} name="body" />
              <Button size="sm" type="submit">Update</Button>
            </form>
          ) : null}
          {teamCtx.membership.role !== "GUEST" ? (
            <form
              action={async () => {
                "use server";
                await deleteDocument(teamId, doc.id);
                redirect(`/t/${teamSlug}/docs`);
              }}
              className="mt-2"
            >
              <Button size="sm" type="submit" variant="danger">Delete</Button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}
