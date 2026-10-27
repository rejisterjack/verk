import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listUserTeams } from "@/lib/rbac";

export default async function TeamsEntryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/t");
  }

  const memberships = await listUserTeams(session.user.id);
  const first = memberships[0];

  if (!first) {
    redirect("/onboarding");
  }

  redirect(`/t/${first.team.slug}/issues`);
}
