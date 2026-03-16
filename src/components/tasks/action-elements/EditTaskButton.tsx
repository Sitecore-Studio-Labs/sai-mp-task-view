"use client";

import { mdiPencilOutline } from "@mdi/js";

import { Button } from "@/components/ui/button";
import { Icon } from "@/lib/icon";

interface EditTaskButtonProps {
  taskKey: string;
  onClick?: (taskKey: string) => void;
}

export function EditTaskButton({ taskKey, onClick }: EditTaskButtonProps) {
  return (
    <Button variant="link" size="sm" className="px-0" onClick={() => onClick?.(taskKey)}>
      <Icon path={mdiPencilOutline} size={0.8} />
      Edit
    </Button>
  );
}
