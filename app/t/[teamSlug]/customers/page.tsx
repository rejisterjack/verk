import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  CreateCustomerForm,
  LinkCustomerRequestForm,
} from "@/components/customers-forms";
import { ViewToolbar } from "@/components/page-header";
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
      where: { teamId, archivedAt: null },
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
    <div className="flex min-h-full flex-col">
      <ViewToolbar
        actions={
          <NextLink
            className="rounded px-2 py-1 text-[12px] text-accent hover:bg-default"
            href={`/t/${teamSlug}/customers/demand`}
          >
            See demand by issue →
          </NextLink>
        }
        title="Customers"
      />
      <section className="border-b border-separator px-4 py-3 text-[12px] text-muted">
        <p className="font-medium text-foreground">Intake endpoint</p>
        <p className="mt-1 font-mono">POST /api/teams/{teamId}/intake</p>
        <p>Authorization: Bearer $INTAKE_TOKEN</p>
        <pre className="mt-2 whitespace-pre-wrap">{`{
  "title": "Request title",
  "customer": "Customer name",
  "detail": "What they asked for"
}`}</pre>
      </section>
      <div className="border-b border-separator px-4 py-3">
        <CreateCustomerForm action={create} />
      </div>
      <ul className="divide-y divide-separator text-[13px]">
        {customers.map((customer) => (
          <li key={customer.id} className="space-y-2 px-4 py-3">
            <p className="font-medium">
              {customer.name}{" "}
              <span className="font-normal text-muted">
                · {customer._count.requests} requests
              </span>
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
                    <Button
                      className="h-7 px-2 text-[12px]"
                      size="sm"
                      type="submit"
                      variant="danger"
                    >
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
            <LinkCustomerRequestForm
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
              issues={issues}
            />
            <form
              action={async () => {
                "use server";
                await deleteCustomer(teamId, customer.id);
                redirect(`/t/${teamSlug}/customers`);
              }}
            >
              <Button
                className="h-7 px-2 text-[12px]"
                size="sm"
                type="submit"
                variant="danger"
              >
                Delete customer
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
