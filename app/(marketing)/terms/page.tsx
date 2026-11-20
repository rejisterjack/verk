import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for self-hosted Verk.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Terms of use</h1>
      <p className="lead">
        Verk is open-source project management software (MIT license). When you
        run your own instance, these terms apply between you and your users.
      </p>
      <h2>Self-hosted service</h2>
      <p>
        You provide the hosting, database, authentication providers, and
        support. Verk is provided as-is without warranty. You are responsible
        for complying with laws that apply to your team and your data.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Users must not attempt to bypass access controls, scrape other
        people&apos;s private issues, or upload malware. Rate limits and role
        checks enforce team boundaries in the application.
      </p>
      <h2>Availability</h2>
      <p>
        Uptime and backups are your responsibility. Free Neon and Vercel tiers may
        sleep or impose usage limits documented by those vendors.
      </p>
      <h2>Changes</h2>
      <p>
        You may update these terms on your instance at any time. The Verk
        project may change the software in new releases; review release notes
        before upgrading.
      </p>
    </article>
  );
}