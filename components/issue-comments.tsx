"use client";

import { Button, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";

import { ReactionBar } from "@/components/reaction-bar";
import { MAX_COMMENT_DEPTH } from "@/lib/comment-depth";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  parentId?: string | null;
  author: { id: string; name: string | null; email: string };
  reactions?: { userId: string; emoji: string }[];
};

export function IssueComments({
  teamId,
  issueId,
  currentUserId,
}: {
  teamId: string;
  issueId: string;
  currentUserId?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
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

  async function post(text: string, parentId?: string) {
    if (!text.trim()) return;
    setPending(true);
    const { isOfflineEnabled } = await import("@/lib/offline/feature");

    if (isOfflineEnabled() && !navigator.onLine) {
      const { queueCommentLocal } =
        await import("@/lib/offline/issue-repository");

      await queueCommentLocal(teamId, issueId, text, parentId ?? null);
      setComments((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          parentId: parentId ?? null,
          body: text,
          createdAt: new Date().toISOString(),
          author: { id: "", name: "You", email: "" },
        },
      ]);
      setBody("");
      setReplyBody("");
      setReplyTo(null);
      setPending(false);

      return;
    }

    await fetch(`/api/teams/${teamId}/issues/${issueId}/comments`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, parentId: parentId ?? null }),
    });
    setBody("");
    setReplyBody("");
    setReplyTo(null);
    setPending(false);
    await load();
  }

  function renderReplies(parentId: string, depth: number) {
    const replies = comments.filter((reply) => reply.parentId === parentId);

    if (!replies.length) return null;

    return (
      <ul className="mt-3 space-y-2 border-l border-separator pl-3">
        {replies.map((reply) => (
          <li key={reply.id}>
            <p className="text-xs text-muted">
              {reply.author.name ?? reply.author.email}
            </p>
            <p className="whitespace-pre-wrap">{reply.body}</p>
            {!reply.id.startsWith("tmp-") && depth < MAX_COMMENT_DEPTH ? (
              <button
                className="mt-1 text-xs text-muted hover:text-foreground"
                type="button"
                onClick={() =>
                  setReplyTo((current) =>
                    current === reply.id ? null : reply.id,
                  )
                }
              >
                Reply
              </button>
            ) : null}
            {replyTo === reply.id && depth < MAX_COMMENT_DEPTH ? (
              <div className="mt-2 flex flex-col gap-2">
                <TextField
                  name="nested-reply"
                  value={replyBody}
                  onChange={setReplyBody}
                >
                  <Label>Reply</Label>
                  <TextArea placeholder="Reply…" rows={2} />
                </TextField>
                <Button
                  isDisabled={pending || !replyBody.trim()}
                  size="sm"
                  type="button"
                  onPress={() => void post(replyBody, reply.id)}
                >
                  Reply
                </Button>
              </div>
            ) : null}
            {renderReplies(reply.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="mt-10 border-t border-separator pt-6">
      <h2 className="text-sm font-semibold">Comments</h2>
      <ul className="mt-3 space-y-3">
        {comments
          .filter((comment) => !comment.parentId)
          .map((c) => {
            return (
              <li
                key={c.id}
                className="rounded-lg border border-separator p-3 text-sm"
              >
                <p className="text-xs text-muted">
                  {c.author.name ?? c.author.email} ·{" "}
                  {new Date(c.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                <ReactionBar
                  currentUserId={currentUserId}
                  disabled={c.id.startsWith("tmp-")}
                  reactions={c.reactions ?? []}
                  onToggle={(emoji) => {
                    void fetch(
                      `/api/teams/${teamId}/issues/${issueId}/reactions`,
                      {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ commentId: c.id, emoji }),
                      },
                    ).then(() => load());
                  }}
                />
                {!c.id.startsWith("tmp-") ? (
                  <div className="mt-2 flex gap-3">
                    <button
                      className="text-xs text-muted hover:text-foreground"
                      type="button"
                      onClick={() =>
                        setReplyTo((current) =>
                          current === c.id ? null : c.id,
                        )
                      }
                    >
                      Reply
                    </button>
                    <button
                      className="text-xs text-danger"
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
                  </div>
                ) : null}
                {renderReplies(c.id, 2)}
                {replyTo === c.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <TextField
                      name="reply"
                      value={replyBody}
                      onChange={setReplyBody}
                    >
                      <Label>Reply</Label>
                      <TextArea placeholder="Reply…" rows={2} />
                    </TextField>
                    <div>
                      <Button
                        isDisabled={pending}
                        size="sm"
                        type="button"
                        onPress={() => void post(replyBody, c.id)}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        {comments.length === 0 ? (
          <li className="text-sm text-muted">No comments yet.</li>
        ) : null}
      </ul>
      <div className="mt-4 flex flex-col gap-2">
        <TextField name="body" value={body} onChange={setBody}>
          <Label>Comment</Label>
          <TextArea placeholder="Leave a comment…" rows={3} />
        </TextField>
        <div>
          <Button
            isDisabled={pending}
            size="sm"
            type="button"
            onPress={() => void post(body)}
          >
            {pending ? "Posting…" : "Comment"}
          </Button>
        </div>
      </div>
    </section>
  );
}
