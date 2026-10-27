import { MarketingNavbar } from "@/components/marketing-navbar";
import { siteConfig } from "@/config/site";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-grow">{children}</main>
      <footer className="border-t border-separator">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">
              Verk
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Linear UX. Vercel deploy. Neon database. Free forever.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted">
            <a
              className="hover:text-foreground transition-colors"
              href={siteConfig.links.github}
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a
              className="hover:text-foreground transition-colors"
              href={siteConfig.links.demo}
              rel="noopener noreferrer"
              target="_blank"
            >
              Demo
            </a>
            <a className="hover:text-foreground transition-colors" href="/docs">
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
