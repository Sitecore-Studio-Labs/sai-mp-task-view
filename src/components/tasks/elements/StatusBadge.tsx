'use client';

import { Badge } from '@/components/ui/badge';
import { STATUS_COLOR_SCHEME_MAP } from '@/constants/statuses';
import { JiraIssue } from '@/types/jira';

export function StatusBadge({
  status,
}: {
  status?: JiraIssue['fields']['status'];
}) {
  return (
    <Badge
      colorScheme={
        status?.statusCategory.key
          ? STATUS_COLOR_SCHEME_MAP[status.statusCategory.key] || 'neutral'
          : 'neutral'
      }
      className="text-xs"
    >
      {status?.name || 'No Status'}
    </Badge>
  );
}
