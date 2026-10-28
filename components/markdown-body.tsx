"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownBody({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-sm text-muted">No description</p>;
  }

  return (
    <div className="prose prose-sm max-w-none text-sm text-foreground [&_a]:text-accent [&_code]:text-xs">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
