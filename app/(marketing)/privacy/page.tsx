import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Verk",
  description: "How self-hosted Verk handles your data.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Privacy</h1>
      <p className="lead">
        Verk is self-hosted software. You operate the instance, the database,
        and the domain. This page describes what the application stores so you
        can publish it for your users.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>
          Account email, display name, password hash (if you use password
          sign-in), and OAuth identifiers from providers you enable.
        </li>
        <li>
          Team membership, issues, comments, attachments metadata, and activity
          your team creates inside Verk.
        </li>
        <li>
          Optional audit log entries and notification preferences you configure.
        </li>
      </ul>
      <h2>What we do not sell</h2>
      <p>
        Verk has no built-in billing and no advertising network. The open-source
        app does not phone home. If you enable Microsoft Clarity on your
        production host, session analytics go to Microsoft under your own
        project id.
      </p>
      <h2>Your responsibilities</h2>
      <p>
        Back up your Neon database, rotate secrets, and define retention for
        your organization. Account export and erasure are available in{" "}
        <strong>Account → Your data</strong> for signed-in users.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about a specific Verk deployment should go to the operator of
        that instance, not the Verk authors.
      </p>
    </article>
  );
}