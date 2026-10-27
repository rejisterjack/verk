import { redirect } from "next/navigation";

import { SubmitButton as Button } from "@/components/submit-button";
import { MarketingNavbar } from "@/components/marketing-navbar";
import { createTeamAction } from "@/lib/actions/teams";
import { auth } from "@/lib/auth";
import { listUserTeams } from "@/lib/rbac";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const memberships = await listUserTeams(session.user.id);

  if (memberships.length > 0) {
    redirect(`/t/${memberships[0].team.slug}/issues`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MarketingNavbar />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Create your team</h1>
            <p className="text-muted text-sm mt-1">
              Teams are the workspace for issues, cycles, and members.
            </p>
          </div>
          <form action={createTeamAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span>Team name</span>
              <input
                required
                className="rounded-lg border border-separator bg-background px-3 py-2"
                name="name"
                placeholder="Acme Engineering"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Slug (optional)</span>
              <input
                className="rounded-lg border border-separator bg-background px-3 py-2"
                name="slug"
                placeholder="acme-engineering"
              />
            </label>
            <Button type="submit">Create team</Button>
          </form>
        </div>
      </main>
    </div>
  );
}
