'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Icon } from '@/lib/icon';
import { mdiChevronDown, mdiMagnify, mdiClose, mdiCheck } from '@mdi/js';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyCard, LoadingCard } from '@/components/common/AsyncStateCards';

export type MultiSelectOption = {
  value: string;
  label: string;
  displayLabel: React.ReactNode;
};

type MultiSelectFilterProps = {
  options?: MultiSelectOption[];
  selected: MultiSelectOption[];
  onChange: (values: MultiSelectOption[]) => void;
  label: string;
  placeholder?: string;
  withSearch?: boolean;
  onSearch?: (query: string) => void;
  loading?: boolean;
};

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  label,
  placeholder = 'Select...',
  withSearch = false,
  onSearch,
  loading = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setOpen((prev) => !prev);
    if (!open) {
      setSearchQuery('');
    }
  };

  // Common handler to close dropdown and reset search
  const closeDropdown = () => {
    setOpen(false);
    setSearchQuery('');
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Handle search
  useEffect(() => {
    if (onSearch) {
      onSearch(searchQuery);
    }
  }, [searchQuery, onSearch]);

  // Filter options locally if no onSearch handler
  const filteredOptions = useMemo(() => {
    if (!options) return [];
    if (onSearch || !searchQuery.trim()) return options;

    return options.filter((option) => {
      return option.label.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [options, searchQuery, onSearch]);

  const toggleValue = (value: string) => {
    const selectedValues = selected.map((s) => s.value);
    if (selectedValues.includes(value)) {
      onChange(selected.filter((s) => s.value !== value));
    } else {
      const optionToAdd = options?.find((o) => o.value === value);
      if (optionToAdd) {
        onChange([...selected, optionToAdd]);
      }
    }
  };

  const displayText =
    selected.length === 0 ? (
      placeholder
    ) : (
      <div className="flex items-center gap-1">
        <Badge className="flex items-center gap-1">
          {selected[0]?.label}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              toggleValue(selected[0].value);
            }}
            variant="ghost"
            size="icon-xxs"
            title="Clear"
          >
            <Icon path={mdiClose} />
          </Button>
        </Badge>

        {selected.length > 1 && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge>+{selected.length - 1}</Badge>
                </TooltipTrigger>
                <TooltipContent className="flex flex-col gap-1">
                  {selected.slice(1).map((item) => (
                    <div key={item.value} className="flex items-center gap-1">
                      <span>{item.label}</span>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleValue(item.value);
                        }}
                        variant="link"
                        size="icon-xxs"
                        title="Clear"
                      >
                        <Icon path={mdiClose} className="text-white" />
                      </Button>
                    </div>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              variant="ghost"
              size="icon-xs"
              title="Clear all"
              className='size-5!'
            >
              <Icon path={mdiClose} />
            </Button>
          </>
        )}
      </div>
    );

  return (
    <div className="relative w-full text-sm" ref={ref}>
      {/* Trigger */}
      <div
        title={`${label} filter`}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
          }

          if (e.key === 'Escape') {
            closeDropdown();
          }
        }}
        className="w-full border rounded-md px-3 py-2 text-left cursor-pointer"
        role="button"
        tabIndex={0}
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
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute mt-1 w-full bg-white border rounded-md shadow-md z-10 max-h-60 overflow-auto">
          {/* Search input */}
          {withSearch && (
            <div className="p-2 border-b">
              <div className="relative">
                <Icon
                  path={mdiMagnify}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground"
                />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                    title="Clear search"
                  >
                    <Icon path={mdiClose} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Options */}
          {loading ? (
            <LoadingCard />
          ) : !filteredOptions || filteredOptions.length === 0 ? (
            <EmptyCard
              message={
                searchQuery ? 'No results found' : 'No options available'
              }
            />
          ) : (
            filteredOptions.map((option, i) => {
              const isSelected = selected.some((s) => s.value === option.value);
              return (
                <button
                  className={`w-full flex items-center justify-between text-left px-3 py-2 cursor-pointer ${
                    isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                  key={`${option.value}-${i}`}
                  role="button"
                  aria-label={option.label}
                  onClick={() => toggleValue(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleValue(option.value);
                    }
                  }}
                >
                  <div className="flex-1">{option.displayLabel}</div>
                  {isSelected && (
                    <Icon
                      path={mdiCheck}
                      className="size-4 text-primary shrink-0 ml-2"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
