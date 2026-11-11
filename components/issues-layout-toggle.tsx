"use client";

import { Button, ButtonGroup } from "@heroui/react";
import { useRouter } from "next/navigation";

export function IssuesLayoutToggle({
  teamSlug,
  mine,
  layout,
  group,
}: {
  teamSlug: string;
  mine: boolean;
  layout: "list" | "board";
  group?: string;
}) {
  const router = useRouter();
  const mineQ = mine ? "assignee=me" : "";

  function go(path: string) {
    router.push(path);
  }

  return (
    <ButtonGroup size="sm" variant="secondary">
      <Button
        variant={layout === "list" ? "primary" : "secondary"}
        onPress={() =>
          go(`/t/${teamSlug}/issues${mineQ ? `?${mineQ}` : ""}`)
        }
      >
        List
      </Button>
      <Button
        variant={layout === "board" && !group ? "primary" : "secondary"}
        onPress={() =>
          go(
            `/t/${teamSlug}/issues?layout=board${mineQ ? `&${mineQ}` : ""}`,
          )
        }
      >
        Board
      </Button>
      <Button
        variant={group === "priority" ? "primary" : "secondary"}
        onPress={() =>
          go(
            `/t/${teamSlug}/issues?layout=board&group=priority${mineQ ? `&${mineQ}` : ""}`,
          )
        }
      >
        By priority
      </Button>
      <Button
        variant={group === "project" ? "primary" : "secondary"}
        onPress={() =>
          go(
            `/t/${teamSlug}/issues?layout=board&group=project${mineQ ? `&${mineQ}` : ""}`,
          )
        }
      >
        By project
      </Button>
    </ButtonGroup>
  );
}
