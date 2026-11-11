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
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  const controlled = value !== undefined;

  return (
    <Select
      {...(controlled
        ? { value: value ?? null, onChange }
        : { defaultValue: defaultValue ?? undefined, onChange })}
      aria-label={ariaLabel}
      isRequired={isRequired}
      name={name}
      placeholder={placeholder}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
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
