import { notFound, redirect } from "next/navigation";

import { IntakeForm } from "@/components/intake-form";
import { ViewToolbar } from "@/components/page-header";
import { requireTeamBySlug } from "@/lib/rbac";
import * as issuesService from "@/lib/services/issues";
import { listLabels } from "@/lib/services/labels";
import {
  addCustomerRequest,
  createCustomer,
  listTemplates,
} from "@/lib/services/surface";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug);
  } catch {
    notFound();
  }
  const [templates, labels] = await Promise.all([
    listTemplates(teamCtx.team.id),
    listLabels(teamCtx.team.id),
  ]);
  const teamId = teamCtx.team.id;
  const userId = teamCtx.user.id;

  async function submit(formData: FormData) {
    "use server";
    const template = templates.find(
      (item) => item.id === String(formData.get("templateId") ?? ""),
    );
    const detail = String(formData.get("detail") ?? "").trim();
    const customerName = String(formData.get("customer") ?? "").trim();
    const issue = await issuesService.createIssue(teamId, userId, {
      title: template?.title || detail || "Intake",
      description: [template?.description, detail].filter(Boolean).join("\n\n"),
      priority: String(
        formData.get("priority") || template?.priority || "NONE",
      ),
      estimate: String(
        formData.get("estimate") || template?.estimate || "NONE",
      ),
      status: "BACKLOG",
      labelIds: template?.labelId ? [template.labelId] : undefined,
    });

    if (customerName) {
      const customer = await createCustomer(teamId, { name: customerName });

      await addCustomerRequest(teamId, customer.id, {
        body: detail || template?.title || "Request",
        issueId: issue.id,
      });
    }
    redirect(`/t/${teamSlug}/issues/${issue.number}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        description="Create an issue from a template. Add a customer name to record a request."
        title="Intake"
      />
      <IntakeForm
        action={submit}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          priority: template.priority,
          estimate: template.estimate,
          labelId: template.labelId,
          labelName:
            labels.find((label) => label.id === template.labelId)?.name ?? null,
        }))}
      />
    </div>
  );
}
