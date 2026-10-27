import { MarketingNavbar } from "@/components/marketing-navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingNavbar />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
