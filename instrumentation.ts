export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.DATABASE_URL) {
        // eslint-disable-next-line no-console
        console.error("CRITICAL CONFIG: DATABASE_URL is not set.");
      }
      if (!process.env.AUTH_SECRET) {
        // eslint-disable-next-line no-console
        console.error("CRITICAL CONFIG: AUTH_SECRET is not set.");
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
