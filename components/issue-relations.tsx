"use client";

import type { Key } from "@heroui/react";

import { Button, Form, Input, Label, TextField } from "@heroui/react";
import { useEffect, useState } from "react";

import { SelectField } from "@/components/ui/select-field";

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
  const [type, setType] = useState<Key>("RELATED");
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
        body: JSON.stringify({ toIssueId: match.id, type: String(type) }),
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
          .filter(
            (relation) =>
              relation.type === "CHILD" || relation.type === "PARENT",
          )
          .map((relation) => {
            const other =
              relation.fromIssue.id === issueId
                ? relation.toIssue
                : relation.fromIssue;

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
          const other = r.fromIssue.id === issueId ? r.toIssue : r.fromIssue;

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
      <Form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={add}>
        <SelectField
          label="Relation"
          options={[
            { id: "RELATED", label: "Related" },
            { id: "BLOCKS", label: "Blocks" },
            { id: "BLOCKED_BY", label: "Blocked by" },
            { id: "PARENT", label: "Parent" },
            { id: "CHILD", label: "Child" },
          ]}
          value={type}
          onChange={(key) => setType(key ?? "RELATED")}
        />
        <TextField
          name="targetNumber"
          value={targetNumber}
          onChange={setTargetNumber}
        >
          <Label>Issue #</Label>
          <Input placeholder="42" />
        </TextField>
        <Button size="sm" type="submit" variant="tertiary">
          Add
        </Button>
      </Form>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </section>
  );
}
