import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton as Button } from "@/components/submit-button";
import { requireTeamBySlug } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import {
  addCustomerRequest,
  createCustomer,
  deleteCustomer,
  deleteCustomerRequest,
  listCustomers,
} from "@/lib/services/surface";

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
  const teamId = teamCtx.team.id;
  const [customers, issues] = await Promise.all([
    listCustomers(teamId),
    prisma.issue.findMany({
      where: { teamId },
      select: { number: true, title: true },
      orderBy: { number: "desc" },
      take: 200,
    }),
  ]);

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
            <ul className="text-xs text-muted">
              {customer.requests.map((request) => (
                <li key={request.id} className="flex items-center gap-2">
                  <span>{request.body}</span>
                  <form
                    action={async () => {
                      "use server";
                      await deleteCustomerRequest(teamId, request.id);
                      redirect(`/t/${teamSlug}/customers`);
                    }}
                  >
                    <Button size="sm" type="submit" variant="danger">Remove</Button>
                  </form>
                </li>
              ))}
            </ul>
            <form
              action={async (formData) => {
                "use server";
                const issueNumber = Number(formData.get("issueNumber"));

                await addCustomerRequest(teamId, customer.id, {
                  body: String(formData.get("body") ?? ""),
                  ...(Number.isFinite(issueNumber) && issueNumber > 0
                    ? { issueNumber }
                    : {}),
                });
                redirect(`/t/${teamSlug}/customers`);
              }}
              className="flex gap-2"
            >
              <input className="flex-1 rounded border border-separator px-2 py-1" name="body" placeholder="Request" required />
              <select className="rounded border border-separator px-2 py-1" name="issueNumber">
                <option value="">No issue</option>
                {issues.map((issue) => (
                  <option key={issue.number} value={issue.number}>
                    #{issue.number} {issue.title}
                  </option>
                ))}
              </select>
              <Button size="sm" type="submit">Link</Button>
            </form>
            <form
              action={async () => {
                "use server";
                await deleteCustomer(teamId, customer.id);
                redirect(`/t/${teamSlug}/customers`);
              }}
            >
              <Button size="sm" type="submit" variant="danger">Delete customer</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
