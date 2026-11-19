import { execute, OperationTypeNode } from "graphql";
import { NextRequest } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-auth";
import { AuthError } from "@/lib/errors";
import { getSchema, parseAndCheck, rootValue } from "@/lib/graphql/schema";

/**
 * `POST { query, variables?, operationName? }`. Reads need a guest or above; mutations are
 * checked again by the services they call (member or above). Uses the same session or API key
 * as the REST API.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const auth = await authenticateRequest(request, teamId, "GUEST");
    let body: { query?: unknown; variables?: unknown; operationName?: unknown };

    try {
      body = await request.json();
    } catch {
      throw new AuthError("Body must be valid JSON", "BAD_REQUEST", 400);
    }
    if (typeof body.query !== "string") {
      throw new AuthError("`query` (string) is required", "BAD_REQUEST", 400);
    }
    const checked = parseAndCheck(body.query);

    if (!checked.document) {
      return Response.json(
        { errors: (checked.errors ?? []).map((message) => ({ message })) },
        { status: 400 },
      );
    }
    const operation = checked.document.definitions.find(
      (d) => d.kind === "OperationDefinition",
    );

    // Subscriptions are not offered; an anonymous operation of any other type runs normally.
    if (operation?.kind === "OperationDefinition") {
      if (operation.operation === OperationTypeNode.SUBSCRIPTION) {
        throw new AuthError(
          "Subscriptions are not supported",
          "BAD_REQUEST",
          400,
        );
      }
    }
    const result = await execute({
      schema: getSchema(),
      document: checked.document,
      rootValue,
      contextValue: { teamId, userId: auth.user.id!, role: auth.role },
      variableValues:
        body.variables && typeof body.variables === "object"
          ? (body.variables as Record<string, unknown>)
          : undefined,
      operationName:
        typeof body.operationName === "string" ? body.operationName : undefined,
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
