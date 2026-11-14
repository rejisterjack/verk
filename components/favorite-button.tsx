"use client";

import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleFavoriteAction } from "@/lib/actions/favorites";

/** A star that adds or removes the item from the signed-in user's sidebar favorites. */
export function FavoriteButton({
  teamSlug,
  kind,
  targetId,
  initial,
  className,
}: {
  teamSlug: string;
  kind: "issue" | "project" | "cycle" | "doc" | "view" | "initiative";
  targetId: string;
  initial: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <button
      aria-label={on ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={on}
      className={
        className ??
        "inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-default hover:text-foreground"
      }
      disabled={pending}
      title={error ?? (on ? "Remove from favorites" : "Add to favorites")}
      type="button"
      onClick={() => {
        const next = !on;

        setOn(next); // optimistic
        setError(null);
        start(async () => {
          const result = await toggleFavoriteAction(teamSlug, kind, targetId);

          if ("error" in result && result.error) {
            setOn(!next);
            setError(result.error);

            return;
          }
          router.refresh();
        });
      }}
    >
      {on ? (
        <StarSolid className="size-4 text-amber-500" />
      ) : (
        <StarOutline className="size-4" />
      )}
    </button>
  );
}
