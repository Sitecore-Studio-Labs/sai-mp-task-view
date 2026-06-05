"use client";

import { mdiArrowLeft } from "@mdi/js";
import { cn } from "@mp/shared";

import { ICON_COLOR_SCHEME } from "../../../constants/icon-colors";
import { Button } from "../../ui/button";
import { Icon } from "../../ui/icon";

type TaskFormHeaderProps = {
  formTitle: string;
  onBack: () => void;
  className?: string;
};

export function TaskFormHeader({ formTitle, onBack, className }: TaskFormHeaderProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        colorScheme="neutral"
        onClick={onBack}
        className="-ml-1 shrink-0"
        data-testid="task-form-back-button"
      >
        <Icon path={mdiArrowLeft} size="sm" colorScheme={ICON_COLOR_SCHEME.brand} />
        Back
      </Button>
      <span className="text-muted-foreground text-sm">{formTitle}</span>
    </div>
  );
}
