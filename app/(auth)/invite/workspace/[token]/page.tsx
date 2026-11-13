import { redirect } from "next/navigation";

import { SubmitButton as Button } from "@/components/submit-button";
import { acceptWorkspaceInviteAction } from "@/lib/actions/workspaces";
import { auth } from "@/lib/auth";

export default async function WorkspaceInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/invite/workspace/${token}`)}`,
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Workspace invite</h1>
      <p className="text-muted text-sm">
        Signed in as {session.user.email}. Accept to join the workspace.
      </p>
      <form
        action={async () => {
          "use server";
          await acceptWorkspaceInviteAction(token);
        }}
      >
        <Button type="submit">Accept invite</Button>
      </form>
    </div>
  );
}
