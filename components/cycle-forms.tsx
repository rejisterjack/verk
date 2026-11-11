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

function CycleDatePicker({
  name,
  label,
  value,
  onChange,
  isRequired,
}: {
  name: string;
  label: string;
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  isRequired?: boolean;
}) {
  return (
    <DatePicker
      isRequired={isRequired}
      name={name}
      value={value}
      onChange={onChange}
    >
      <Label className="text-[12px] text-muted">{label}</Label>
      <DateField.Group className="!h-7 !min-h-7 !max-h-7 !gap-1 !overflow-hidden !px-2.5 !py-0 text-[12px] leading-none">
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
      className="grid items-end gap-3 rounded-lg border border-separator p-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      <TextField isRequired className="lg:col-span-2" name="name">
        <Label className="text-[12px] text-muted">Name</Label>
        <Input
          className="!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none"
          placeholder="Cycle 2"
        />
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
      <div className="flex h-7 items-center gap-3">
        <Checkbox name="isActive" value="on">
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label className="text-[12px]">Active</Label>
          </Checkbox.Content>
        </Checkbox>
        <Button
          className="h-7 px-2.5 text-[12px]"
          isDisabled={!startDate || !endDate}
          size="sm"
          type="submit"
        >
          Create
        </Button>
      </div>
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
        <Input className="!h-7 !min-h-7 !px-2.5 !py-0 text-[12px] leading-none" />
      </TextField>
      <CycleDatePicker
        label="Start"
        name="startDate"
        value={startDate}
        onChange={setStartDate}
      />
      <CycleDatePicker
        label="End"
        name="endDate"
        value={endDate}
        onChange={setEndDate}
      />
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
