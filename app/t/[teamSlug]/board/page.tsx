import { redirect } from "next/navigation";

/** Board is a layout on Issues — keep URL for bookmarks. */
export default async function BoardRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { teamSlug } = await params;
  const q = await searchParams;
  const sp = new URLSearchParams({ layout: "board" });

  for (const [k, v] of Object.entries(q)) {
    if (v) sp.set(k, v);
  }
  redirect(`/t/${teamSlug}/issues?${sp.toString()}`);
}
