import { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import * as issuesService from "@/lib/services/issues";
import { addCustomerRequest, createCustomer } from "@/lib/services/surface";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  const expected = process.env.INTAKE_TOKEN;

  if (!expected) {
    return Response.json(
      { error: "Intake is not configured" },
      { status: 404 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { teamId } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    customer?: string;
    detail?: string;
  };
  const title = body.title?.trim();

  if (!title) {
    return Response.json({ error: "title required" }, { status: 400 });
  }
  const owner = await prisma.membership.findFirst({
    where: { teamId, role: "OWNER" },
  });

  if (!owner) {
    return Response.json({ error: "Team not found" }, { status: 404 });
  }
  const issue = await issuesService.createIssue(teamId, owner.userId, {
    title,
    description: body.detail ?? "",
    status: "BACKLOG",
  });

  if (body.customer?.trim()) {
    const customer = await createCustomer(teamId, {
      name: body.customer.trim(),
    });

    await addCustomerRequest(teamId, customer.id, {
      body: body.detail || title,
      issueId: issue.id,
    });
  }

  return Response.json({ number: issue.number, id: issue.id }, { status: 201 });
}
