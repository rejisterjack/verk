import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import { addCustomerRequest, createCustomer, listCustomers } from "@/lib/services/surface";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  let teamCtx;

  try {
    teamCtx = await requireTeamBySlug(teamSlug, "MEMBER");
  } catch {
    notFound();
  }
  const customers = await listCustomers(teamCtx.team.id);
  const teamId = teamCtx.team.id;

  async function create(formData: FormData) {
    "use server";
    await createCustomer(teamId, {
      name: String(formData.get("name") ?? ""),
      domain: String(formData.get("domain") ?? ""),
    });
    redirect(`/t/${teamSlug}/customers`);
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader description="Link requests to issues from the API" title="Customers" />
      <form action={create} className="flex gap-2">
        <input required className="rounded-lg border border-separator px-3 py-2 text-sm" name="name" placeholder="Name" />
        <input className="rounded-lg border border-separator px-3 py-2 text-sm" name="domain" placeholder="domain.com" />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {customers.map((customer) => (
          <li key={customer.id} className="space-y-2 border-b border-separator py-2">
            <p>
              {customer.name} · {customer._count.requests} requests
            </p>
            <form
              action={async (formData) => {
                "use server";
                await addCustomerRequest(teamId, customer.id, {
                  body: String(formData.get("body") ?? ""),
                  issueId: String(formData.get("issueId") ?? "") || undefined,
                });
                redirect(`/t/${teamSlug}/customers`);
              }}
              className="flex gap-2"
            >
              <input className="flex-1 rounded border border-separator px-2 py-1" name="body" placeholder="Request" required />
              <input className="w-40 rounded border border-separator px-2 py-1" name="issueId" placeholder="Issue id" />
              <Button size="sm" type="submit">Link</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
