import { redirect } from "next/navigation";

import { SubmitButton as Button } from "@/components/submit-button";
import { auth } from "@/lib/auth";
import { acceptInviteAction } from "@/lib/actions/teams";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Team invite</h1>
      <p className="text-muted text-sm">
        Signed in as {session.user.email}. Accept to join the team.
      </p>
      <form
        action={async () => {
          "use server";
          await acceptInviteAction(token);
        }}
      >
        <Button type="submit">Accept invite</Button>
      </form>
    </div>
  );
}
