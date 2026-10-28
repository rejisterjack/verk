"use client";

import { Button } from "@heroui/react";
import { useEffect, useState } from "react";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
};

export function IssueComments({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await fetch(`/api/teams/${teamId}/issues/${issueId}/comments`, {
      credentials: "same-origin",
    });

    if (!res.ok) return;
    const data = await res.json();

    setComments(data.comments ?? []);
  }

  useEffect(() => {
    void load();
  }, [teamId, issueId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    const { isOfflineEnabled } = await import("@/lib/offline/feature");

    if (isOfflineEnabled() && !navigator.onLine) {
      const { queueCommentLocal } = await import(
        "@/lib/offline/issue-repository"
      );

      await queueCommentLocal(teamId, issueId, body);
      setComments((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          body,
          createdAt: new Date().toISOString(),
          author: { id: "", name: "You", email: "" },
        },
      ]);
      setBody("");
      setPending(false);

      return;
    }

    await fetch(`/api/teams/${teamId}/issues/${issueId}/comments`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBody("");
    setPending(false);
    await load();
  }

  return (
    <section className="mt-10 border-t border-separator pt-6">
      <h2 className="text-sm font-semibold">Comments</h2>
      <ul className="mt-3 space-y-3">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-separator p-3 text-sm"
          >
            <p className="text-xs text-muted">
              {c.author.name ?? c.author.email} ·{" "}
              {new Date(c.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            <div className="mt-2 flex gap-1">
              {["👍", "👀", "🎉"].map((emoji) => (
                <button
                  key={emoji}
                  className="rounded border border-separator px-1 text-xs"
                  type="button"
                  onClick={() => {
                    void fetch(
                      `/api/teams/${teamId}/issues/${issueId}/reactions`,
                      {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ commentId: c.id, emoji }),
                      },
                    );
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {!c.id.startsWith("tmp-") ? (
              <button
                className="mt-2 text-xs text-danger"
                type="button"
                onClick={() => {
                  void fetch(
                    `/api/teams/${teamId}/issues/${issueId}/comments`,
                    {
                      method: "DELETE",
                      credentials: "same-origin",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ commentId: c.id }),
                    },
                  ).then(() => load());
                }}
              >
                Delete
              </button>
            ) : null}
          </li>
        ))}
        {comments.length === 0 ? (
          <li className="text-sm text-muted">No comments yet.</li>
        ) : null}
      </ul>
      <form className="mt-4 flex flex-col gap-2" onSubmit={submit}>
        <textarea
          className="min-h-20 rounded-lg border border-separator bg-background px-3 py-2 text-sm"
          placeholder="Leave a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div>
          <Button isDisabled={pending} size="sm" type="submit">
            {pending ? "Posting…" : "Comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
