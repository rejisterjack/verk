import { MarketingNavbar } from "@/components/marketing-navbar";
import { isPrivateHost } from "@/lib/auth-allowlist";
import { isDemoMode } from "@/lib/utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="verk-grain verk-grid relative flex min-h-screen flex-col">
      <MarketingNavbar demoMode={isDemoMode()} privateHost={isPrivateHost()} />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        {children}
      </main>
    </div>
  );
}
