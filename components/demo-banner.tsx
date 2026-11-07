import Link from "next/link";

import { isDemoMode } from "@/lib/utils";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-foreground">
      Public demo — shared playground with fake data. Don&apos;t put secrets
      here.{" "}
      <Link className="underline underline-offset-2" href="/login">
        demo@verk.dev / demo1234
      </Link>
      . Data resets daily. Self-host for private use.
    </div>
  );
}
