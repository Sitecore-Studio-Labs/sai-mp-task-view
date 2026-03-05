'use client';

import Image from 'next/image';
import { JiraPriority } from '@/types/jira';

export function PriorityBadge({ priority }: { priority?: JiraPriority }) {
  return (
    <div className="flex gap-1 items-center">
      {priority?.iconUrl && (
        <Image
          src={priority.iconUrl}
          alt={priority.name}
          width={12}
          height={12}
        />
      )}
      <span className="text-xs text-muted-foreground">
        {priority?.name || 'No Priority'}
      </span>
    </div>
  );
}
