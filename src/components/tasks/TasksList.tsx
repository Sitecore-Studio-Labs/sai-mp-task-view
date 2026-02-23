'use client';

import { useState, useMemo, useEffect } from 'react';
import { STATUS_COLOR_SCHEME_MAP } from '@/constants/statuses';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { mdiAccountOutline, mdiChevronDown, mdiChevronRight } from '@mdi/js';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getIssueTypeIconPath } from '@/components/tasks/task-form/create-task-utils';
import { JiraIssue } from '@/types/jira';
import { cn } from '@/lib/utils';

/** Mock statuses for the status dropdown (UI only; no backend transition yet). */
const MOCK_WORKFLOW_STATUSES = ['To Do', 'In Progress', 'Done', 'In Review', 'Blocked'];

type ViewMode = 'list' | 'hierarchy';

export function TasksList({
  tasks,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  viewMode = 'list',
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  viewMode?: ViewMode;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    const byKey = new Map<string, JiraIssue>();
    tasks.forEach((t) => byKey.set(t.key, t));
    const roots: JiraIssue[] = [];
    const childrenByParentKey = new Map<string, JiraIssue[]>();
    tasks.forEach((issue) => {
      const parentKey = issue.fields.parent?.key;
      if (!parentKey || !byKey.has(parentKey)) {
        roots.push(issue);
      } else {
        const siblings = childrenByParentKey.get(parentKey) ?? [];
        siblings.push(issue);
        childrenByParentKey.set(parentKey, siblings);
      }
    });
    roots.sort((a, b) => (a.key < b.key ? -1 : 1));
    return { roots, childrenByParentKey };
  }, [tasks]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasHierarchy = tree.childrenByParentKey.size > 0;
  useEffect(() => {
    if (!hasHierarchy) return;
    const parentKeys = tree.childrenByParentKey;
    queueMicrotask(() => {
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        parentKeys.forEach((_, parentKey) => next.add(parentKey));
        return next;
      });
    });
  }, [hasHierarchy, tree.childrenByParentKey]);

  const useTree = viewMode === 'hierarchy' && tree.roots.length > 0;
  const showIndent = viewMode === 'hierarchy';

  if (useTree) {
    return (
      <div className="space-y-1 w-full">
        {tree.roots.map((issue) => (
          <IssueTreeNode
            key={issue.key}
            issue={issue}
            childrenByParentKey={tree.childrenByParentKey}
            expandedKeys={expandedKeys}
            toggleExpand={toggleExpand}
            level={0}
            showIndent={showIndent}
          />
        ))}
        {hasNextPage && (
          <Button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            variant="outline"
            className="w-full mt-4"
          >
            {isFetchingNextPage ? <Spinner className="size-4" /> : 'Load more'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-0 w-full list-none">
      {tasks.map((issue) => (
        <li key={issue.key} className="w-full border-b border-border/50 last:border-b-0">
          <IssueRow issue={issue} />
        </li>
      ))}
      {hasNextPage && (
        <li>
          <Button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            variant="outline"
            className="w-full mt-4"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center gap-2">
                <Spinner />
              </span>
            ) : (
              'Load more'
            )}
          </Button>
        </li>
      )}
    </ul>
  );
}

function IssueRow({ issue }: { issue: JiraIssue }) {
  return (
    <div className="w-full py-3.5 px-4 sm:px-5 hover:bg-muted/30 transition-colors">
      <IssueRowContent issue={issue} />
    </div>
  );
}

function IssueTypeIcon({ issue }: { issue: JiraIssue }) {
  const it = issue.fields.issuetype;
  const iconUrl = it?.iconUrl;
  const name = it?.name ?? 'Issue';

  if (iconUrl) {
    return (
      <span
        className="flex shrink-0 items-center justify-center size-8 rounded overflow-hidden bg-muted/50"
        title={name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt={name}
          width={20}
          height={20}
          className="object-contain"
        />
      </span>
    );
  }
  const fallbackPath = getIssueTypeIconPath(name);
  return (
    <span
      className="flex shrink-0 items-center justify-center size-8 rounded bg-muted text-muted-foreground"
      title={name}
    >
      <Icon path={fallbackPath} size="sm" />
    </span>
  );
}

function StatusDropdown({
  currentStatus,
  statusColor,
}: {
  currentStatus: string;
  statusColor: string;
}) {
  const [open, setOpen] = useState(false);
  const statuses = MOCK_WORKFLOW_STATUSES.filter((s) => s !== currentStatus);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors shrink-0',
            'hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-ring',
            statusColor === 'success' && 'bg-success/12 text-success',
            statusColor === 'primary' && 'bg-primary/12 text-primary',
            statusColor === 'warning' && 'bg-warning/12 text-warning',
            statusColor === 'neutral' && 'bg-muted/80 text-muted-foreground',
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {currentStatus}
          <Icon path={mdiChevronDown} size="sm" className="size-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuItem disabled className="text-muted-foreground">
          Change status (coming soon)
        </DropdownMenuItem>
        {statuses.map((name) => (
          <DropdownMenuItem
            key={name}
            onSelect={(e) => e.preventDefault()}
            className="opacity-70"
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IssueTreeNode({
  issue,
  childrenByParentKey,
  expandedKeys,
  toggleExpand,
  level,
  showIndent = true,
}: {
  issue: JiraIssue;
  childrenByParentKey: Map<string, JiraIssue[]>;
  expandedKeys: Set<string>;
  toggleExpand: (key: string) => void;
  level: number;
  showIndent?: boolean;
}) {
  const children = childrenByParentKey.get(issue.key) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedKeys.has(issue.key);
  const indent = showIndent ? level * 20 : 0;

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden w-full shadow-sm">
      <div
        className={cn(
          'flex gap-2 items-start py-2.5 pr-3 w-full',
          hasChildren && 'cursor-pointer hover:bg-muted/30',
        )}
        style={{ paddingLeft: 8 + indent }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(issue.key);
            }}
            className="shrink-0 mt-0.5 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center size-6"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <Icon
              path={isExpanded ? mdiChevronDown : mdiChevronRight}
              size="sm"
              className="size-4"
            />
          </button>
        ) : (
          <span className="shrink-0 w-6 flex items-center justify-center" aria-hidden />
        )}
        <div
          className="min-w-0 flex-1 py-0.5"
          onClick={hasChildren ? () => toggleExpand(issue.key) : undefined}
          role={hasChildren ? 'button' : undefined}
        >
          <IssueRowContent issue={issue} />
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="border-t border-border/60 bg-muted/20">
          {children.map((child) => (
            <IssueTreeNode
              key={child.key}
              issue={child}
              childrenByParentKey={childrenByParentKey}
              expandedKeys={expandedKeys}
              toggleExpand={toggleExpand}
              level={level + 1}
              showIndent={showIndent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRowContent({ issue }: { issue: JiraIssue }) {
  const status = issue.fields.status;
  const statusColor =
    STATUS_COLOR_SCHEME_MAP[status.statusCategory.key] ?? 'neutral';
  const priority = issue.fields.priority;

  return (
    <div className="flex gap-3 items-start w-full min-w-0">
      <IssueTypeIcon issue={issue} />
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {issue.key}
          </span>
          {priority && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              {priority.iconUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={priority.iconUrl}
                    alt={priority.name}
                    width={12}
                    height={12}
                    className="object-contain"
                  />
                  <span>{priority.name}</span>
                </>
              ) : (
                <span>{priority.name}</span>
              )}
            </span>
          )}
        </div>
        <h3 className="text-sm leading-snug break-words text-foreground/85">
          {issue.fields.summary}
        </h3>
      </div>
      <div className="shrink-0 ml-auto pl-3 flex items-center gap-2">
        <StatusDropdown currentStatus={status.name} statusColor={statusColor} />
        {issue.fields.assignee ? (
          <Avatar className="size-7" title={issue.fields.assignee.displayName}>
            <AvatarImage
              src={issue.fields.assignee.avatarUrls?.['24x24']}
              alt={issue.fields.assignee.displayName}
            />
            <AvatarFallback>
              <Icon path={mdiAccountOutline} className="size-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <span
            className="flex items-center justify-center size-7 rounded-full bg-muted/40 text-muted-foreground"
            title="Unassigned"
          >
            <Icon path={mdiAccountOutline} className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

export type { ViewMode };
