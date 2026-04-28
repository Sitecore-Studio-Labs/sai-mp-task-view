"use client";

import { mdiCheck, mdiChevronDown, mdiClose, mdiMagnify } from "@mdi/js";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyCard, LoadingCard } from "../../common/AsyncStateCards";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Icon } from "../../ui/icon";
import { Input } from "../../ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";

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
  placeholder = "Select...",
  withSearch = false,
  onSearch,
  loading = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const closeDropdown = () => {
    setOpen(false);
    setSearchQuery("");
  };

  const toggleDropdown = () => {
    setOpen((prev) => !prev);
    if (open) setSearchQuery("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) closeDropdown();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) closeDropdown();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (onSearch) onSearch(searchQuery);
  }, [searchQuery, onSearch]);

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    if (onSearch || !searchQuery.trim()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [options, searchQuery, onSearch]);

  const toggleValue = (value: string) => {
    const selectedValues = selected.map((s) => s.value);
    if (selectedValues.includes(value)) {
      onChange(selected.filter((s) => s.value !== value));
    } else {
      const optionToAdd = options?.find((o) => o.value === value);
      if (optionToAdd) onChange([...selected, optionToAdd]);
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
              className="size-5!"
            >
              <Icon path={mdiClose} />
            </Button>
          </>
        )}
      </div>
    );

  return (
    <div className="relative w-full text-sm" ref={ref}>
      <div
        title={`${label} filter`}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDropdown();
          }
          if (e.key === "Escape") closeDropdown();
        }}
        className="w-full cursor-pointer rounded-md border px-3 py-2 text-left"
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-0.5 text-sm font-medium">{label}</p>
            {displayText}
          </div>
          <Icon
            path={mdiChevronDown}
            className={`size-4 ${open ? "rotate-180" : ""} transition-transform`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-md">
          {withSearch && (
            <div className="border-b p-2">
              <div className="relative">
                <Icon
                  path={mdiMagnify}
                  className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2"
                />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pr-8 pl-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                    }}
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 right-1 -translate-y-1/2"
                    title="Clear search"
                  >
                    <Icon path={mdiClose} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <LoadingCard isFlat />
          ) : !filteredOptions || filteredOptions.length === 0 ? (
            <EmptyCard message={searchQuery ? "No results found" : "No options available"} isFlat />
          ) : (
            filteredOptions.map((option, i) => {
              const isSelected = selected.some((s) => s.value === option.value);
              return (
                <button
                  className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"}`}
                  key={`${option.value}-${i}`}
                  role="button"
                  aria-label={option.label}
                  onClick={() => toggleValue(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleValue(option.value);
                    }
                  }}
                >
                  <div className="flex-1">{option.displayLabel}</div>
                  {isSelected && (
                    <Icon path={mdiCheck} className="text-primary ml-2 size-4 shrink-0" />
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
