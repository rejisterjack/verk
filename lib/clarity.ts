const PROJECT_ID = /^[a-z0-9]+$/;

/**
 * The Clarity tag loads only on a real production deployment. Preview builds
 * are `NODE_ENV=production` with `VERCEL_ENV=preview`, and a self-hosted copy
 * stays quiet until its own host sets the variable.
 */
export function clarityProjectId(
  env: {
    nodeEnv?: string;
    vercelEnv?: string;
    projectId?: string;
  } = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    projectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
  },
): string | null {
  if (env.nodeEnv !== "production") return null;
  if (env.vercelEnv && env.vercelEnv !== "production") return null;

  const id = env.projectId?.trim() ?? "";

  if (!PROJECT_ID.test(id)) return null;

  return id;
}
