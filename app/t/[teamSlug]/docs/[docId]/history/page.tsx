import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import { ViewToolbar } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { diffLines, diffStats } from "@/lib/line-diff";
import { prisma } from "@/lib/db";
import { requireTeamBySlug } from "@/lib/rbac";
import {
  listDocumentRevisions,
  restoreDocumentRevision,
} from "@/lib/services/surface";

export default async function DocHistoryPage({
  params,
}: {
  params: Promise<{ teamSlug: string; docId: string }>;
}) {
  const { teamSlug, docId } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "GUEST");
  } catch {
    notFound();
  }
  const teamId = teamCtx.team.id;
  const doc = await prisma.document.findFirst({ where: { id: docId, teamId } });

  if (!doc) notFound();
  const revisions = await listDocumentRevisions(teamId, docId);
  const canEdit = teamCtx.membership.role !== "GUEST";
  const userId = teamCtx.user.id!;

  async function restore(formData: FormData) {
    "use server";
    await restoreDocumentRevision(
      teamId,
      userId,
      String(formData.get("id") ?? ""),
    );
    redirect(`/t/${teamSlug}/docs/${docId}/history`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <NextLink
            className="rounded px-2 py-1 text-[12px] text-accent hover:bg-default"
            href={`/t/${teamSlug}/docs`}
          >
            ← Documents
          </NextLink>
        }
        description="Earlier versions, newest first. Each is compared with the version that replaced it."
        title={`History: ${doc.title}`}
      />
      {revisions.length === 0 ? (
        <p className="px-4 py-8 text-[13px] text-muted">
          No earlier versions yet. One is saved each time the document changes.
        </p>
      ) : (
        <ul className="divide-y divide-separator">
          {revisions.map((revision, index) => {
            // The version that replaced this one is the next newer revision, or the current text.
            const newer = index === 0 ? doc : revisions[index - 1]!;
            const lines = diffLines(revision.body, newer.body);
            const stats = diffStats(lines);

            return (
              <li key={revision.id} className="px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{revision.title}</span>
                  <span className="text-[12px] text-muted">
                    {revision.createdAt
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}{" "}
                    · changed after this: +{stats.added} −{stats.removed}
                  </span>
                  {canEdit ? (
                    <form action={restore} className="ml-auto">
                      <input name="id" type="hidden" value={revision.id} />
                      <Button size="sm" type="submit" variant="ghost">
                        Restore this version
                      </Button>
                    </form>
                  ) : null}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[12px] text-muted">
                    Show changes
                  </summary>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-separator bg-surface/60 p-2 text-[12px] leading-5">
                    {lines.map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.kind === "add"
                            ? "bg-success/10"
                            : line.kind === "del"
                              ? "bg-danger/10 text-danger line-through"
                              : "text-muted"
                        }
                      >
                        {line.kind === "add"
                          ? "+ "
                          : line.kind === "del"
                            ? "− "
                            : "  "}
                        {line.text}
                      </div>
                    ))}
                  </pre>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
