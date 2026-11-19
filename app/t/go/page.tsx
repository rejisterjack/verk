import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { parseGoTarget, pathFor, sharedToDraft } from "@/lib/app-links";
import { listUserTeams } from "@/lib/rbac";

/**
 * Entry for the installed app's shortcuts (`?to=new|mine|inbox`) and for "Share to Verk"
 * (`?title=&text=&url=`). It signs you in if needed, picks your first team and sends you on.
 */
export default async function GoPage({
  searchParams,
}: {
  searchParams: Promise<{
    to?: string;
    title?: string;
    text?: string;
    url?: string;
  }>;
}) {
  const query = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    const back = new URLSearchParams(
      Object.entries(query).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );

    redirect(`/login?callbackUrl=${encodeURIComponent(`/t/go?${back}`)}`);
  }
  const memberships = await listUserTeams(session.user.id);
  const first = memberships[0];

  if (!first) redirect("/onboarding");
  const shared = sharedToDraft(query);

  redirect(pathFor(first.team.slug, parseGoTarget(query.to), shared));
}
