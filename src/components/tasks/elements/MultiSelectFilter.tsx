'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Icon } from '@/lib/icon';
import { mdiChevronDown } from '@mdi/js';
import { useState, useRef, useEffect } from 'react';

export type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectFilterProps = {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  label: string;
  placeholder?: string;
};

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  label,
  placeholder = 'Select...',
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  const displayText =
    selected.length === 0 ? (
      placeholder
    ) : selected.length === 1 ? (
      <Badge>{selectedLabels[0]}</Badge>
    ) : (
      <>
        {<Badge>{selectedLabels[0]}</Badge>}{' '}
        <Badge>+{selected.length - 1}</Badge>
      </>
    );

  return (
    <div className="relative w-full text-sm" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full border rounded-md px-3 py-2 text-left cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-0.5">{label}</p>
            {displayText}
          </div>
          <Icon
            path={mdiChevronDown}
            className={`size-4 ${open ? 'rotate-180' : ''} transition-transform`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute mt-1 w-full bg-white border rounded-md shadow-md z-10 max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              className="flex items-center px-3 hover:bg-gray-50"
              key={option.value}
            >
              <Checkbox
                id={`${option.value}`}
                aria-label={option.label}
                checked={selected.includes(option.value)}
                onCheckedChange={() => toggleValue(option.value)}
                className="cursor-pointer"
              />
              <Label
                htmlFor={`${option.value}`}
                className="w-full p-3 cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
