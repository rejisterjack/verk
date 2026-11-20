"use client";

import { Form, Input, Label, TextArea, TextField } from "@heroui/react";

import { SubmitButton as Button } from "@/components/submit-button";
import {
  createDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";

type LinkOption = { id: string; name: string };

const selectClass =
  "mt-1 block h-8 w-full rounded-md border border-separator bg-background px-2 text-[13px] text-foreground";

function LinkFields({
  projects,
  initiatives,
  projectId,
  initiativeId,
}: {
  projects?: LinkOption[];
  initiatives?: LinkOption[];
  projectId?: string | null;
  initiativeId?: string | null;
}) {
  if (!projects?.length && !initiatives?.length) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {projects ? (
        <label className="min-w-40 text-[12px] text-muted">
          Project
          <select
            className={selectClass}
            defaultValue={projectId ?? ""}
            name="projectId"
          >
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {initiatives ? (
        <label className="min-w-40 text-[12px] text-muted">
          Initiative
          <select
            className={selectClass}
            defaultValue={initiativeId ?? ""}
            name="initiativeId"
          >
            <option value="">None</option>
            {initiatives.map((initiative) => (
              <option key={initiative.id} value={initiative.id}>
                {initiative.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function CreateDocumentForm({
  teamSlug,
  projects,
  initiatives,
  hiddenProjectId,
  hiddenInitiativeId,
  redirectTo,
}: {
  teamSlug: string;
  projects?: LinkOption[];
  initiatives?: LinkOption[];
  hiddenProjectId?: string;
  hiddenInitiativeId?: string;
  redirectTo?: string;
}) {
  return (
    <Form
      action={async (formData) => {
        formData.set("teamSlug", teamSlug);
        await createDocumentAction(formData);
      }}
      className="space-y-2"
    >
      {hiddenProjectId ? (
        <input name="projectId" type="hidden" value={hiddenProjectId} />
      ) : null}
      {hiddenInitiativeId ? (
        <input name="initiativeId" type="hidden" value={hiddenInitiativeId} />
      ) : null}
      {redirectTo ? (
        <input name="redirectTo" type="hidden" value={redirectTo} />
      ) : null}
      <TextField isRequired name="title">
        <Label>Title</Label>
        <Input placeholder="Title" />
      </TextField>
      <TextField name="body">
        <Label>Body</Label>
        <TextArea placeholder="Markdown" />
      </TextField>
      <LinkFields initiatives={initiatives} projects={projects} />
      <Button type="submit">Save document</Button>
    </Form>
  );
}

export function UpdateDocumentForm({
  teamSlug,
  documentId,
  title,
  body,
  projects,
  initiatives,
  projectId,
  initiativeId,
  redirectTo,
  lockProjectId,
  lockInitiativeId,
}: {
  teamSlug: string;
  documentId: string;
  title: string;
  body: string;
  projects?: LinkOption[];
  initiatives?: LinkOption[];
  projectId?: string | null;
  initiativeId?: string | null;
  redirectTo?: string;
  lockProjectId?: string;
  lockInitiativeId?: string;
}) {
  return (
    <Form
      action={async (formData) => {
        formData.set("teamSlug", teamSlug);
        formData.set("documentId", documentId);
        await updateDocumentAction(formData);
      }}
      className="mt-3 space-y-2"
    >
      {/* The text this edit started from, so the server can merge with a save made meanwhile. */}
      <input name="baseBody" type="hidden" value={body} />
      {redirectTo ? (
        <input name="redirectTo" type="hidden" value={redirectTo} />
      ) : null}
      {lockProjectId ? (
        <input name="projectId" type="hidden" value={lockProjectId} />
      ) : null}
      {lockInitiativeId ? (
        <input name="initiativeId" type="hidden" value={lockInitiativeId} />
      ) : null}
      <TextField isRequired defaultValue={title} name="title">
        <Label>Title</Label>
        <Input />
      </TextField>
      <TextField defaultValue={body} name="body">
        <Label>Body</Label>
        <TextArea />
      </TextField>
      {lockProjectId || lockInitiativeId ? null : (
        <LinkFields
          initiativeId={initiativeId}
          initiatives={initiatives}
          projectId={projectId}
          projects={projects}
        />
      )}
      <Button size="sm" type="submit">
        Update
      </Button>
    </Form>
  );
}
