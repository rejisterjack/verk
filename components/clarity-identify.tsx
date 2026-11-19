"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type ClarityFn = ((...args: unknown[]) => void) & { q?: IArguments[] };

/**
 * Associates the session with the internal user id. Clarity hashes that id
 * before it leaves the browser. The friendly name is omitted so a person's
 * name and email stay out of the dashboard. Re-called on each navigation
 * because Clarity attributes identify to the current page.
 */
export function ClarityIdentify({ userId }: { userId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const host = window as Window & { clarity?: ClarityFn };

    if (typeof host.clarity !== "function") {
      host.clarity = function clarityQueue() {
        const fn = host.clarity!;
        (fn.q = fn.q || []).push(arguments);
      };
    }
    host.clarity("identify", userId);
  }, [pathname, userId]);

  return null;
}
