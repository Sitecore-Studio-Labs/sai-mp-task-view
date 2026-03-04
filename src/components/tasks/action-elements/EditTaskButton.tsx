'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/lib/icon';
import { mdiPencilOutline } from '@mdi/js';

interface EditTaskButtonProps {
  taskKey: string;
}

export function EditTaskButton({ taskKey }: EditTaskButtonProps) {
  return (
    <Button
      variant="link"
      size="sm"
      className="px-0"
      onClick={() => console.log(taskKey)}
    >
      <Icon path={mdiPencilOutline} size={0.8} />
      Edit
    </Button>
  );
}
