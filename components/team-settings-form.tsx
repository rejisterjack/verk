"use client";

import { Form, Input, Label, Switch, TextField } from "@heroui/react";

import { SelectField } from "@/components/ui/select-field";
import { SubmitButton as Button } from "@/components/submit-button";

type Member = {
  user: { id: string; name: string | null; email: string };
};

type TeamSettings = {
  name: string;
  slug: string;
  cycleDurationWeeks: number;
  cycleCooldownDays: number;
  githubRepo: string | null;
  githubMergeCompletes: boolean;
  slackWebhookUrl: string | null;
  triageOwnerId: string | null;
  timezone: string;
  slaWeekdays: string;
  slaStartHour: number;
  slaEndHour: number;
  slaHours: unknown;
};

const SLA_KEYS = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"] as const;

export function TeamSettingsForm({
  action,
  team,
  members,
}: {
  action: (formData: FormData) => void | Promise<void>;
  team: TeamSettings;
  members: Member[];
}) {
  const slaRecord =
    team.slaHours &&
    typeof team.slaHours === "object" &&
    !Array.isArray(team.slaHours)
      ? (team.slaHours as Record<string, number>)
      : {};

  return (
    <Form action={action} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
        <div>
          <h2 className="font-semibold text-foreground">General</h2>
          <p className="text-xs text-muted">
            Basic team workspace identification
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField isRequired defaultValue={team.name} name="name">
            <Label>Team Name</Label>
            <Input />
          </TextField>
          <TextField isRequired defaultValue={team.slug} name="slug">
            <Label>Slug</Label>
            <Input />
          </TextField>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
        <div>
          <h2 className="font-semibold text-foreground">Sprint Cycles</h2>
          <p className="text-xs text-muted">
            Configure default duration and cooldown period between cycles
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            defaultValue={String(team.cycleDurationWeeks)}
            name="cycleDurationWeeks"
          >
            <Label>Cycle duration (weeks)</Label>
            <Input max={8} min={1} type="number" />
          </TextField>
          <TextField
            defaultValue={String(team.cycleCooldownDays)}
            name="cycleCooldownDays"
          >
            <Label>Cycle cooldown (days)</Label>
            <Input min={0} type="number" />
          </TextField>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
        <div>
          <h2 className="font-semibold text-foreground">Integrations</h2>
          <p className="text-xs text-muted">
            Connect GitHub and Slack for automated notifications and workflows
          </p>
        </div>
        <div className="space-y-3">
          <TextField defaultValue={team.githubRepo ?? ""} name="githubRepo">
            <Label>GitHub repository (owner/repo)</Label>
            <Input placeholder="e.g. acme/web-app" />
          </TextField>
          <Switch
            defaultSelected={team.githubMergeCompletes}
            name="githubMergeCompletes"
            value="true"
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Content>
              <Label>Auto-complete when a linked GitHub PR merges</Label>
            </Switch.Content>
          </Switch>
          <TextField
            defaultValue={team.slackWebhookUrl ?? ""}
            name="slackWebhookUrl"
          >
            <Label>Slack incoming webhook</Label>
            <Input placeholder="https://hooks.slack.com/services/..." />
          </TextField>
          <p className="text-[11px] text-muted">
            Receives automated alerts on issue creation, assignment, and status
            updates
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-separator bg-surface p-5">
        <div>
          <h2 className="font-semibold text-foreground">Triage & SLA</h2>
          <p className="text-xs text-muted">
            Configure default triage ownership, operational windows, and
            priority resolution targets
          </p>
        </div>
        <div className="space-y-3">
          <SelectField
            clearable
            defaultValue={team.triageOwnerId ?? undefined}
            label="Default triage owner"
            name="triageOwnerId"
            options={members.map((member) => ({
              id: member.user.id,
              label: member.user.name ?? member.user.email,
            }))}
            placeholder="None (unassigned queue)"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField defaultValue={team.timezone} name="timezone">
              <Label>SLA timezone</Label>
              <Input placeholder="UTC" />
            </TextField>
            <TextField defaultValue={team.slaWeekdays} name="slaWeekdays">
              <Label>SLA active weekdays (1=Mon … 7=Sun)</Label>
              <Input />
            </TextField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              defaultValue={String(team.slaStartHour)}
              name="slaStartHour"
            >
              <Label>Operating start hour (0-23)</Label>
              <Input max={23} min={0} type="number" />
            </TextField>
            <TextField defaultValue={String(team.slaEndHour)} name="slaEndHour">
              <Label>Operating end hour (1-24)</Label>
              <Input max={24} min={1} type="number" />
            </TextField>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">
              Priority SLA targets (hours to resolve)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SLA_KEYS.map((key) => (
                <TextField
                  key={key}
                  defaultValue={
                    slaRecord[key] != null ? String(slaRecord[key]) : ""
                  }
                  name={`sla_${key}`}
                >
                  <Label>{key}</Label>
                  <Input min={0} placeholder="Hours" type="number" />
                </TextField>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Button type="submit">Save settings</Button>
    </Form>
  );
}

export function TeamDeleteForm({
  action,
  teamSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  teamSlug: string;
}) {
  return (
    <Form
      action={action}
      className="space-y-3 rounded-xl border border-danger/40 p-4"
    >
      <h2 className="font-semibold text-danger">Danger zone</h2>
      <p className="text-sm text-muted">
        Type <code>{teamSlug}</code> to permanently delete this team.
      </p>
      <TextField name="confirm">
        <Label className="sr-only">Confirm slug</Label>
        <Input placeholder={teamSlug} />
      </TextField>
      <Button type="submit" variant="danger">
        Delete team
      </Button>
    </Form>
  );
}
