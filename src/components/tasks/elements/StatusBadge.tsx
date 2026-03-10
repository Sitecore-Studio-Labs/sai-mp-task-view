'use client';

import { Badge } from '@/components/ui/badge';
import { STATUS_COLOR_SCHEME_MAP } from '@/constants/statuses';
import { JiraIssue } from '@/types/jira';

export function StatusBadge({
  status,
  clickable = false,
}: {
  status?: JiraIssue['fields']['status'];
  clickable?: boolean;
}) {
  return (
    <Badge
      colorScheme={
        status?.statusCategory.key
          ? STATUS_COLOR_SCHEME_MAP[status.statusCategory.key] || 'neutral'
          : 'neutral'
      }
      className={`text-xs ${clickable ? 'cursor-pointer' : ''}`}
    >
      {status?.name || 'No Status'}
    </Badge>
  );
}
