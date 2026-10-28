"use client";

import { Button } from "@heroui/react";
import { useEffect, useState } from "react";

type Rel = {
  id: string;
  type: string;
  fromIssue: { id: string; number: number; title: string };
  toIssue: { id: string; number: number; title: string };
};

export function IssueRelations({
  teamId,
  teamSlug,
  issueId,
}: {
  teamId: string;
  teamSlug: string;
  issueId: string;
}) {
  const [relations, setRelations] = useState<Rel[]>([]);
  const [type, setType] = useState("RELATED");
  const [targetNumber, setTargetNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(
      `/api/teams/${teamId}/issues/${issueId}/relations`,
      { credentials: "same-origin" },
    );

    if (!res.ok) return;
    const data = await res.json();

    setRelations(data.relations ?? []);
  }

  useEffect(() => {
    void load();
  }, [teamId, issueId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = Number(targetNumber);

    if (!Number.isFinite(num)) {
      setError("Enter a valid issue number");

      return;
    }
    const lookup = await fetch(
      `/api/teams/${teamId}/issues?number=${num}&take=1`,
      { credentials: "same-origin" },
    );
    const body = await lookup.json();
    const match = (body.issues ?? []).find(
      (i: { number: number }) => i.number === num,
    );

    if (!match) {
      setError("No issue with that number");

      return;
    }

    const res = await fetch(
      `/api/teams/${teamId}/issues/${issueId}/relations`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toIssueId: match.id, type }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      setError(err.error ?? "Failed to add relation");

      return;
    }
    setTargetNumber("");
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/teams/${teamId}/issues/${issueId}/relations/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    await load();
  }

  return (
    <section className="mt-10 border-t border-separator pt-6">
      <h2 className="text-sm font-semibold">Sub-issues</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {relations
          .filter((relation) => relation.type === "CHILD" || relation.type === "PARENT")
          .map((relation) => {
            const other = relation.fromIssue.id === issueId ? relation.toIssue : relation.fromIssue;

            return (
              <li key={relation.id}>
                {relation.type}: {other.title}
              </li>
            );
          })}
      </ul>
      <h2 className="mt-6 text-sm font-semibold">Relations</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {relations.map((r) => {
          const other =
            r.fromIssue.id === issueId ? r.toIssue : r.fromIssue;

          return (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-separator px-3 py-2"
            >
              <span>
                <span className="text-xs text-muted">{r.type}</span>{" "}
                <a
                  className="text-accent hover:underline"
                  href={`/t/${teamSlug}/issues/${other.number}`}
                >
                  {teamSlug.slice(0, 3).toUpperCase()}-{other.number}{" "}
                  {other.title}
                </a>
              </span>
              <Button size="sm" variant="ghost" onPress={() => remove(r.id)}>
                Remove
              </Button>
            </li>
          );
        })}
        {relations.length === 0 ? (
          <li className="text-muted">No relations yet.</li>
        ) : null}
      </ul>
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={add}>
        <select
          className="rounded-lg border border-separator bg-background px-2 py-1.5 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="RELATED">Related</option>
          <option value="BLOCKS">Blocks</option>
          <option value="BLOCKED_BY">Blocked by</option>
          <option value="PARENT">Parent</option>
          <option value="CHILD">Child</option>
        </select>
        <input
          className="w-28 rounded-lg border border-separator bg-background px-2 py-1.5 text-sm"
          placeholder="Issue #"
          value={targetNumber}
          onChange={(e) => setTargetNumber(e.target.value)}
        />
        <Button size="sm" type="submit" variant="tertiary">
          Add
        </Button>
      </form>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </section>
  );
}
