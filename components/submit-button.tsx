"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button, Spinner } from "@heroui/react";
import { useFormStatus } from "react-dom";

type Props = ComponentProps<typeof Button> & {
  /** Shown while the parent form's server action is running. */
  pendingLabel?: ReactNode;
};

/** HeroUI submit button that reflects `useFormStatus` for server-action forms. */
export function SubmitButton({
  children,
  pendingLabel,
  isDisabled,
  type = "submit",
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} isDisabled={isDisabled || pending} type={type}>
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner aria-hidden color="current" size="sm" />
          <span>{pendingLabel ?? "Working…"}</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
