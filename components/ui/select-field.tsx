"use client";

import type { Key } from "@heroui/react";

import { Label, ListBox, Select } from "@heroui/react";

export type SelectOption = { id: string; label: string };

type SelectFieldProps = {
  label: string;
  options: SelectOption[];
  name?: string;
  placeholder?: string;
  defaultValue?: Key | null;
  value?: Key | null;
  onChange?: (key: Key | null) => void;
  isRequired?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  hideLabel?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
};

/** Stock HeroUI Select composition — no style overrides. */
export function SelectField({
  label,
  options,
  name,
  placeholder,
  defaultValue,
  value,
  onChange,
  isRequired,
  clearable,
  fullWidth = true,
  hideLabel = false,
  className,
  triggerClassName,
  size = "md",
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  const controlled = value !== undefined;
  const compact = size === "sm";

  return (
    <Select
      {...(controlled
        ? { value: value ?? null, onChange }
        : { defaultValue: defaultValue ?? undefined, onChange })}
      aria-label={hideLabel ? undefined : ariaLabel}
      className={className}
      fullWidth={fullWidth}
      isRequired={isRequired}
      name={name}
      placeholder={
        hideLabel ? (placeholder ?? label) : (placeholder ?? "Select…")
      }
    >
      {hideLabel ? null : <Label>{label}</Label>}
      <Select.Trigger
        className={[
          "min-w-0",
          compact &&
            "!h-7 !min-h-7 !gap-1 !px-2.5 !py-0 !text-[12px] !leading-none [&_.select__value]:!text-[12px] [&_.select__value]:!leading-none [&_.select__indicator]:!size-3.5 [&_.select__clear-button]:!size-4",
          triggerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Select.Value className="min-w-0 truncate" />
        {clearable ? <Select.ClearButton /> : null}
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.id}
              id={option.id}
              textValue={option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
