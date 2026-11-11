export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production") {
      const missing: string[] = [];

      if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
      if (!process.env.AUTH_SECRET) missing.push("AUTH_SECRET");
      if (!process.env.AUTH_URL) missing.push("AUTH_URL");

      if (missing.length) {
        // eslint-disable-next-line no-console
        console.error(
          `CRITICAL CONFIG: missing required env: ${missing.join(", ")}`,
        );
      }

      if (process.env.DEMO_MODE === "true") {
        // eslint-disable-next-line no-console
        console.warn(
          "DEMO_MODE=true: open registration/team deletion are locked; treat as shared playground.",
        );
      }
    }
  }
}

export async function onRequestError(
  err: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
  },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
  },
) {
  // eslint-disable-next-line no-console
  console.error(`[Unhandled Error] ${request.method} ${request.path}:`, {
    message: err.message,
    digest: err.digest,
    routePath: context.routePath,
    routeType: context.routeType,
  });
}
