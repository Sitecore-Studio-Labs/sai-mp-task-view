"use client";

import { mdiCalendarBlankOutline } from "@mdi/js";
import { cn } from "@mp/shared";
import { addDays, format } from "date-fns";
import * as React from "react";
import type { DateRange, DropdownProps } from "react-day-picker";

import { Icon } from "../../lib/icon";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export function CustomDropdown({
  options = [],
  value,
  onChange,
  disabled,
  name,
  id,
}: DropdownProps) {
  return (
    <Select
      disabled={disabled}
      name={name}
      value={value != null ? String(value) : ""}
      onValueChange={(val) => {
        const e = {
          target: { value: val },
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange?.(e);
      }}
    >
      <SelectTrigger
        id={id}
        size="sm"
        className="[&_svg:not([class*='text-'])]:text-accent-foreground z-50 bg-transparent px-3 text-sm dark:bg-transparent dark:hover:bg-transparent"
      >
        <SelectValue />
      </SelectTrigger>

      <SelectContent className="borde min-w-20 rounded-md p-0">
        {options.map(({ value: v, label, disabled }) => (
          <SelectItem
            key={String(v)}
            value={String(v)}
            disabled={disabled}
            className="cursor-pointer px-3 py-1.5 text-sm"
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DatePickerSimple() {
  const [date, setDate] = React.useState<Date>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          colorScheme={"neutral"}
          className={cn(
            "border-input data-[state=open]:border-primary text-md data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 bg-body-bg flex h-10 w-fit items-center justify-between gap-2 rounded-md border-1 px-3 py-2 whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[2px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-1",
            !date && "text-muted-foreground",
          )}
        >
          <Icon path={mdiCalendarBlankOutline} size={1} className="text-muted-foreground" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          captionLayout="dropdown"
          components={{ Dropdown: CustomDropdown }}
        />
      </PopoverContent>
    </Popover>
  );
}

function DatePickerWithRange() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 20),
    to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={"outline"}
          colorScheme={"neutral"}
          className={cn(
            "border-input data-[state=open]:border-primary text-md data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 bg-body-bg flex h-10 w-fit items-center justify-between gap-2 rounded-md border-1 px-3 py-2 whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[2px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-1",
            !date && "text-muted-foreground",
          )}
        >
          <Icon path={mdiCalendarBlankOutline} size={1} className="text-muted-foreground" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
              </>
            ) : (
              format(date.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
          captionLayout="dropdown"
          components={{ Dropdown: CustomDropdown }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePickerSimple, DatePickerWithRange };
