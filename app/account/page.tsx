import { redirect } from "next/navigation";
import NextLink from "next/link";

import { AppearanceSettings } from "@/components/appearance-settings";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PasskeySettings } from "@/components/passkey-settings";
import { PrivacySettings } from "@/components/privacy-settings";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { listPasskeys } from "@/lib/services/passkeys";
import { getTwoFactorStatus } from "@/lib/services/two-factor";
import { SubmitButton as Button } from "@/components/submit-button";
import { MarketingNavbar } from "@/components/marketing-navbar";
import { logoutAction } from "@/lib/actions/auth";
import { auth } from "@/lib/auth";
import { listUserTeams } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) redirect("/login");

  const memberships = await listUserTeams(session.user.id);
  const twoFactor = await getTwoFactorStatus(session.user.id);
  const passkeys = await listPasskeys(session.user.id);

  return (
    <div className="min-h-screen flex flex-col">
      <MarketingNavbar />
      <main className="container mx-auto max-w-xl flex-1 px-6 py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-muted text-sm mt-1">Your Verk profile</p>
        </div>

        <div className="rounded-xl border border-separator p-4 space-y-2 text-sm">
          <p>
            <span className="text-muted">Name:</span> {user.name ?? "—"}
          </p>
          <p>
            <span className="text-muted">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-muted">Sign-in:</span>{" "}
            {[
              user.passwordHash ? "password" : null,
              ...user.accounts.map((a) => a.provider),
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Password</h2>
          <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Two-factor sign-in</h2>
          <TwoFactorSettings
            enabled={twoFactor.enabled}
            hasPassword={Boolean(user.passwordHash)}
            recoveryLeft={twoFactor.recoveryLeft}
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Passkeys</h2>
          <PasskeySettings
            passkeys={passkeys.map((passkey) => ({
              id: passkey.id,
              name: passkey.name,
              createdAt: passkey.createdAt.toISOString(),
              lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
              backedUp: passkey.backedUp,
            }))}
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Your data</h2>
          <PrivacySettings hasPassword={Boolean(user.passwordHash)} />
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Appearance</h2>
          <AppearanceSettings />
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Teams</h2>
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <NextLink
                  className="text-accent underline text-sm"
                  href={`/t/${m.team.slug}/issues`}
                >
                  {m.team.name}
                </NextLink>{" "}
                <span className="text-muted text-xs">({m.role})</span>
              </li>
            ))}
          </ul>
        </div>

        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </main>
    </div>
  );
}
