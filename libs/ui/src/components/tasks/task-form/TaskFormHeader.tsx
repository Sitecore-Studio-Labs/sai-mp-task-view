"use client";

import { mdiArrowLeft } from "@mdi/js";

import { Button } from "../../ui/button";
import { Icon } from "../../ui/icon";

type TaskFormHeaderProps = {
  formTitle: string;
  onBack: () => void;
};

export function TaskFormHeader({ formTitle, onBack }: TaskFormHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        colorScheme="neutral"
        onClick={onBack}
        className="-ml-1 shrink-0"
      >
        <Icon path={mdiArrowLeft} size="sm" colorScheme="inherit" />
        Back
      </Button>
      <span className="text-muted-foreground text-sm">{formTitle}</span>
    </div>
  );
}
