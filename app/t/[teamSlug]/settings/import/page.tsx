import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { rateLimit } from "@/lib/rate-limit";
import { requireTeamBySlug } from "@/lib/rbac";
import * as importService from "@/lib/services/import";

export default async function ImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{
    created?: string;
    total?: string;
    errors?: string;
  }>;
}) {
  const { teamSlug } = await params;
  const query = await searchParams;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }

  const teamId = teamCtx.team.id;
  const userId = teamCtx.user.id!;
  const errorList = query.errors
    ? decodeURIComponent(query.errors).split("\n").filter(Boolean)
    : [];

  async function importCsv(formData: FormData) {
    "use server";
    const file = formData.get("file");

    if (!(file instanceof File)) return;
    if (!rateLimit(`import:${teamId}`).ok) {
      redirect(`/t/${teamSlug}/settings/import?errors=${encodeURIComponent("Too many requests")}`);
    }
    const text = await file.text();
    const result = await importService.importLinearCsv(teamId, userId, text);
    const qs = new URLSearchParams({
      created: String(result.created),
      total: String(result.total),
    });

    if (result.errors.length) {
      qs.set("errors", result.errors.slice(0, 20).join("\n"));
    }
    redirect(`/t/${teamSlug}/settings/import?${qs.toString()}`);
  }

  async function importApi(formData: FormData) {
    "use server";
    const apiKey = String(formData.get("apiKey") ?? "").trim();
    const teamKey = String(formData.get("teamKey") ?? "").trim() || undefined;

    if (!apiKey) return;
    if (!rateLimit(`import:${teamId}`).ok) {
      redirect(`/t/${teamSlug}/settings/import?errors=${encodeURIComponent("Too many requests")}`);
    }
    try {
      const result = await importService.importFromLinearApi(
        teamId,
        userId,
        apiKey,
        teamKey,
      );
      const qs = new URLSearchParams({
        created: String(result.created),
        total: String(result.total),
      });

      if (result.errors?.length) {
        qs.set("errors", result.errors.slice(0, 20).join("\n"));
      }
      redirect(`/t/${teamSlug}/settings/import?${qs.toString()}`);
    } catch (e) {
      redirect(
        `/t/${teamSlug}/settings/import?created=0&total=0&errors=${encodeURIComponent(
          e instanceof Error ? e.message : "Import failed",
        )}`,
      );
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        description="Bring issues from Linear via CSV export or personal API key"
        title="Import from Linear"
      />

      {query.created != null ? (
        <div className="mb-6 rounded-xl border border-separator bg-surface/60 p-4 text-sm">
          <p className="font-medium">
            Imported {query.created} of {query.total} issues
          </p>
          {errorList.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-danger">
              {errorList.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted">No errors.</p>
          )}
        </div>
      ) : null}

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold">CSV import</h2>
        <p className="text-sm text-muted">
          In Linear: Issues → Export CSV. Map columns Title, Description,
          Status, Priority, Assignee.
        </p>
        <form action={importCsv} className="space-y-3">
          <input
            required
            accept=".csv,text/csv"
            className="block w-full text-sm"
            name="file"
            type="file"
          />
          <Button type="submit">Upload CSV</Button>
        </form>
      </section>

      <section className="space-y-3 border-t border-separator pt-8">
        <h2 className="text-sm font-semibold">Linear API import</h2>
        <p className="text-sm text-muted">
          Paste a Linear personal API key. Imports up to 2,000 issues (Linear
          API cap for this launch). Keys are used once and not stored.
        </p>
        <form action={importApi} className="space-y-3">
          <input
            required
            className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            name="apiKey"
            placeholder="lin_api_…"
            type="password"
          />
          <input
            className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            name="teamKey"
            placeholder="Optional Linear team key filter (e.g. ENG)"
          />
          <Button type="submit" variant="secondary">
            Import from API
          </Button>
        </form>
      </section>
    </div>
  );
}
