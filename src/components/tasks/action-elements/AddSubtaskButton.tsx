"use client";

import { mdiPlus } from "@mdi/js";

import { Button } from "@/components/ui/button";
import { Icon } from "@/lib/icon";

interface AddSubtaskButtonProps {
  taskKey: string;
}

export function AddSubtaskButton({ taskKey }: AddSubtaskButtonProps) {
  return (
    <Button size="icon-xs" variant="outline" onClick={() => console.log(taskKey)}>
      <Icon path={mdiPlus} />
    </Button>
  );
}
