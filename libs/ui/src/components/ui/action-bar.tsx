"use client";
import {
  mdiArchiveOutline,
  mdiClose,
  mdiCloudOffOutline,
  mdiCloudUploadOutline,
  mdiContentCopy,
  mdiDotsHorizontal,
  mdiTrashCanOutline,
} from "@mdi/js";
import { cn } from "@mp/shared";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@/lib/icon";

export interface ActionBarButton {
  label: string;
  icon?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  colorScheme?: "primary" | "neutral" | "success" | "danger";
  ariaLabel?: string;
}

export interface ActionBarMenuItem {
  label: string;
  icon?: string;
  onClick?: () => void;
  variant?: "default" | "destructive";
}

export interface ActionBarProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedCount?: number;
  onCancel?: () => void;

  onPublish?: () => void;
  onUnpublish?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;

  buttons?: ActionBarButton[];
  menuItems?: ActionBarMenuItem[];
  className?: string;
  align?: "left" | "center" | "right";
}

export function ActionBar({
  isOpen = false,
  onOpenChange,
  selectedCount = 0,
  onCancel,

  onPublish,
  onUnpublish,
  onDuplicate,
  onArchive,
  onDelete,

  buttons,
  menuItems,
  className,
  align = "center",
}: ActionBarProps) {
  const handleCancel = () => {
    onOpenChange?.(false);
    onCancel?.();
  };

  const alignClasses = {
    left: "ml-4",
    center: "mx-auto",
    right: "mr-4 ml-auto",
  };

  // Default buttons if not provided via array
  const defaultButtons: ActionBarButton[] = buttons || [
    {
      label: "Publish",
      icon: mdiCloudUploadOutline,
      onClick: onPublish,
      variant: "outline",
      colorScheme: "neutral",
    },
    {
      label: "Unpublish",
      icon: mdiCloudOffOutline,
      onClick: onUnpublish,
      variant: "outline",
      colorScheme: "neutral",
    },
    {
      label: "Duplicate",
      icon: mdiContentCopy,
      onClick: onDuplicate,
      variant: "default",
      colorScheme: "primary",
    },
  ];

  // Default menu items if not provided via array
  const defaultMenuItems: ActionBarMenuItem[] = menuItems || [
    {
      label: "Archive",
      icon: mdiArchiveOutline,
      onClick: onArchive,
      variant: "default",
    },
    {
      label: "Delete",
      icon: mdiTrashCanOutline,
      onClick: onDelete,
      variant: "destructive",
    },
  ];

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-50 px-4 pb-4 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-y-0" : "translate-y-full",
        className,
      )}
    >
      <div
        className={cn(
          "border-border bg-background flex w-full max-w-2xl items-center justify-between gap-4 rounded-lg border-t px-4 py-3 shadow-lg",
          alignClasses[align],
        )}
      >
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                aria-label="Cancel"
                className="hover:bg-neutral-bg"
              >
                <Icon path={mdiClose} size={1} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>

          <span className="text-neutral-fg font-semibold">{selectedCount} selected</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Desktop buttons */}
          <div className="hidden items-center gap-2 sm:flex">
            {defaultButtons.map((button, index) => (
              <Button
                key={index}
                variant={button.variant || "outline"}
                colorScheme={button.colorScheme || "neutral"}
                onClick={button.onClick}
              >
                {button.icon && <Icon path={button.icon} size={1} />}
                {button.label}
              </Button>
            ))}
          </div>

          {/* Mobile icon buttons */}
          <div className="flex items-center gap-2 sm:hidden">
            {defaultButtons.map((button, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={button.onClick}
                    className="text-foreground hover:bg-neutral-bg"
                    aria-label={button.ariaLabel || button.label}
                  >
                    {button.icon && <Icon path={button.icon} size={1} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{button.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* More menu */}
          {defaultMenuItems.length > 0 && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-neutral-bg"
                      aria-label="More"
                    >
                      <Icon path={mdiDotsHorizontal} size={1} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>More</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start">
                <DropdownMenuGroup className="*:data-[slot=dropdown-menu-item]:[&>svg]:text-muted-foreground">
                  {defaultMenuItems.map((item, index) => (
                    <DropdownMenuItem
                      key={index}
                      variant={item.variant || "default"}
                      onClick={item.onClick}
                    >
                      {item.icon && <Icon path={item.icon} size={1.5} />}
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
