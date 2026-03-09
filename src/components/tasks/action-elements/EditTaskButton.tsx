'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/lib/icon';
import { mdiPencilOutline } from '@mdi/js';

interface EditTaskButtonProps {
  taskKey: string;
  onClick?: (taskKey: string) => void;
}

export function EditTaskButton({ taskKey, onClick }: EditTaskButtonProps) {
  return (
    <Button
      variant="link"
      size="sm"
      className="px-0"
      onClick={() => onClick?.(taskKey)}
    >
      <Icon path={mdiPencilOutline} size={0.8} />
      Edit
    </Button>
  );
}
