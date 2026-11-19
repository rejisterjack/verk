import { ZodError } from "zod";

import { AuthError } from "@/lib/errors";

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Invalid input",
        code: "VALIDATION",
        issues: error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }
  if (error instanceof AuthError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details && typeof error.details === "object"
          ? (error.details as Record<string, unknown>)
          : {}),
      },
      { status: error.status },
    );
  }
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console -- useful during local debugging
    console.error(error);
  }

  return Response.json(
    { error: "Internal server error", code: "INTERNAL" },
    { status: 500 },
  );
}
