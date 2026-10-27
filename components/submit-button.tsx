"use client";

import type { ComponentProps } from "react";

import { Button } from "@heroui/react";

type Props = ComponentProps<typeof Button>;

/** HeroUI Button for use inside Server Component forms. */
export function SubmitButton(props: Props) {
  return <Button {...props} />;
}
