import { pruneAuditLog } from "@/lib/services/audit";
import { pruneOAuthCodes } from "@/lib/services/oauth";
import { pruneDeliveries, retryDueDeliveries } from "@/lib/services/webhooks";
import { snapshotActiveCycles } from "@/lib/services/cycle-analytics";
import { advanceDueCycles } from "@/lib/services/cycles";
import { purgeArchivedIssues } from "@/lib/services/issues";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return new Response(null, { status: 404 });

  const header = request.headers.get("authorization");

  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const advanced = await advanceDueCycles();
  // Same daily run: permanently remove issues archived more than 30 days ago.
  const purged = await purgeArchivedIssues();
  // Record today's scope and progress for every running cycle (feeds the burndown history).
  const snapshots = await snapshotActiveCycles();
  // Keep the audit log to a year.
  const auditPruned = await pruneAuditLog();
  // Drop OAuth codes that were issued but never redeemed.
  const oauthCodesPruned = await pruneOAuthCodes();
  // Retry webhook deliveries that failed earlier, and drop the old delivery log.
  const webhooksRetried = await retryDueDeliveries();
  const deliveriesPruned = await pruneDeliveries();

  return Response.json({
    advanced,
    purged,
    snapshots,
    auditPruned,
    oauthCodesPruned,
    webhooksRetried,
    deliveriesPruned,
  });
}
