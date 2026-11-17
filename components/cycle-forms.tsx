"use client";

import type { DateValue } from "@internationalized/date";

import {
  Calendar,
  Checkbox,
  DateField,
  DatePicker,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { useEffect, useState } from "react";

import { isoDateOnly } from "@/components/form-options";
import { SubmitButton as Button } from "@/components/submit-button";

const compactInput = "!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none";

const dateGroupClass =
  "!h-7 !min-h-7 !max-h-7 !gap-1 !overflow-hidden !px-2.5 !py-0 text-[12px] leading-none";

function CycleDatePicker({
  name,
  label,
  value,
  onChange,
  isRequired,
  className,
}: {
  name: string;
  label: string;
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  isRequired?: boolean;
  className?: string;
}) {
  return (
    <DatePicker
      className={className}
      isRequired={isRequired}
      name={name}
      value={value}
      onChange={onChange}
    >
      <Label className="text-[12px] text-muted">{label}</Label>
      <DateField.Group className={dateGroupClass}>
        <DateField.Input className="!h-7 !min-h-0 !items-center !py-0 !leading-none">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger className="!size-5 shrink-0">
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={`Choose ${label.toLowerCase()} date`}>
          <Calendar.Header>
            <Calendar.Heading />
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}

export function CreateCycleForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [startDate, setStartDate] = useState<DateValue | null>(null);
  const [endDate, setEndDate] = useState<DateValue | null>(null);

  useEffect(() => {
    const start = today(getLocalTimeZone());

    setStartDate(start);
    setEndDate(start.add({ weeks: 2 }));
  }, []);

  return (
    <Form
      data-compact-form
      action={action}
      className="grid w-full max-w-3xl items-end gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_9.75rem_9.75rem_3.5rem_auto]"
    >
      <TextField fullWidth isRequired className="sm:col-span-2 lg:col-span-1" name="name">
        <Label className="text-[12px] text-muted">Name</Label>
        <Input className={compactInput} placeholder="Cycle 2" />
      </TextField>
      <CycleDatePicker
        isRequired
        label="Start"
        name="startDate"
        value={startDate}
        onChange={setStartDate}
      />
      <CycleDatePicker
        isRequired
        label="End"
        name="endDate"
        value={endDate}
        onChange={setEndDate}
      />
      <div className="flex flex-col gap-1">
        <Label className="text-[12px] text-muted">Active</Label>
        <div className="flex h-7 items-center">
          <Checkbox name="isActive" value="on">
            <Checkbox.Control className="border border-separator bg-background">
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label className="sr-only">Mark as active cycle</Label>
            </Checkbox.Content>
          </Checkbox>
        </div>
      </div>
      <Button
        className="h-7 w-full px-3 text-[12px] sm:col-span-2 sm:w-auto lg:col-span-1"
        isDisabled={!startDate || !endDate}
        size="sm"
        type="submit"
        variant="secondary"
      >
        Create
      </Button>
    </Form>
  );
}

export function UpdateCycleForm({
  action,
  cycle,
}: {
  action: (formData: FormData) => void | Promise<void>;
  cycle: {
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    capacityPoints?: number | null;
  };
}) {
  const start = isoDateOnly(cycle.startDate);
  const end = isoDateOnly(cycle.endDate);
  const [startDate, setStartDate] = useState<DateValue | null>(
    start ? parseDate(start) : null,
  );
  const [endDate, setEndDate] = useState<DateValue | null>(
    end ? parseDate(end) : null,
  );

  return (
    <Form
      data-compact-form
      action={action}
      className="grid items-end gap-3 rounded-lg border border-separator p-3 sm:grid-cols-2"
    >
      <TextField
        className="sm:col-span-2"
        defaultValue={cycle.name}
        name="name"
      >
        <Label className="text-[12px] text-muted">Name</Label>
        <Input className={compactInput} />
      </TextField>
      <CycleDatePicker
        className="min-w-[9.5rem] flex-1"
        label="Start"
        name="startDate"
        value={startDate}
        onChange={setStartDate}
      />
      <CycleDatePicker
        className="min-w-[9.5rem] flex-1"
        label="End"
        name="endDate"
        value={endDate}
        onChange={setEndDate}
      />
      <TextField
        defaultValue={
          cycle.capacityPoints == null ? "" : String(cycle.capacityPoints)
        }
        name="capacityPoints"
      >
        <Label className="text-[12px] text-muted">Capacity (points)</Label>
        <Input className={compactInput} min={0} type="number" />
      </TextField>
      <Checkbox defaultSelected={cycle.isActive} name="isActive" value="on">
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>Active cycle</Label>
        </Checkbox.Content>
      </Checkbox>
      <div>
        <Button className="h-7 px-2.5 text-[12px]" size="sm" type="submit">
          Save
        </Button>
      </div>
    </Form>
  );
}
