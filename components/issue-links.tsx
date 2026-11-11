"use client";

import type { Key } from "@heroui/react";

import { Button, Form, Input, Label, TextField } from "@heroui/react";
import { useEffect, useState } from "react";

import { SelectField } from "@/components/ui/select-field";

type Link = { id: string; kind: string; url: string };

export function IssueLinks({
  teamId,
  issueId,
}: {
  teamId: string;
  issueId: string;
}) {
  const [links, setLinks] = useState<Link[]>([]);
  const [kind, setKind] = useState<Key>("figma");
  const [url, setUrl] = useState("");

  async function load() {
    const res = await fetch(`/api/teams/${teamId}/issues/${issueId}/links`, {
      credentials: "same-origin",
    });

    if (!res.ok) return;
    const data = await res.json();

    setLinks(data.links ?? []);
  }

  useEffect(() => {
    void load();
  }, [teamId, issueId]);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Links</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {links.map((link) => (
          <li key={link.id} className="flex items-center gap-2">
            <span className="text-muted">{link.kind}</span>{" "}
            <a
              className="text-accent"
              href={link.url}
              rel="noreferrer"
              target="_blank"
            >
              {link.url}
            </a>
            <Button
              size="sm"
              variant="danger"
              onPress={() => {
                void fetch(`/api/teams/${teamId}/issues/${issueId}/links`, {
                  method: "DELETE",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: link.id }),
                }).then(() => load());
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <Form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void fetch(`/api/teams/${teamId}/issues/${issueId}/links`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: String(kind), url }),
          }).then(() => {
            setUrl("");
            void load();
          });
        }}
      >
        <SelectField
          label="Kind"
          options={[
            { id: "figma", label: "Figma" },
            { id: "sentry", label: "Sentry" },
            { id: "link", label: "Link" },
          ]}
          value={kind}
          onChange={(key) => setKind(key ?? "figma")}
        />
        <TextField
          className="min-w-48 flex-1"
          name="url"
          value={url}
          onChange={setUrl}
        >
          <Label>URL</Label>
          <Input placeholder="https://" />
        </TextField>
        <Button size="sm" type="submit">
          Add
        </Button>
      </Form>
    </section>
  );
}
