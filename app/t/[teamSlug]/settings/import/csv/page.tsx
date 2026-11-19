import { notFound } from "next/navigation";
import NextLink from "next/link";

import { CsvImport } from "@/components/csv-import";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";

export default async function CsvImportPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;

  try {
    await requireTeamBySlug(teamSlug, "MEMBER");
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl px-4 py-3">
      <ViewToolbar
        description="Any CSV: Jira, GitHub, Asana, Trello or a spreadsheet. You check the column mapping and a preview before anything is created."
        title="Import from CSV"
      />
      <CsvImport teamSlug={teamSlug} />
      <p className="mt-6 text-[12px] text-muted">
        Importing from Linear?{" "}
        <NextLink
          className="text-accent hover:underline"
          href={`/t/${teamSlug}/settings/import`}
        >
          Use the Linear importer
        </NextLink>
        .
      </p>
    </div>
  );
}
