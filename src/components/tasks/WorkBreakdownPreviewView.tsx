"use client";

import { useState, createContext, useContext } from "react";
import {
  mdiArrowLeft,
  mdiFileDocumentOutline,
  mdiDotsVertical,
  mdiPencil,
  mdiDelete,
  mdiPlus,
  mdiChevronDown,
  mdiChevronRight,
  mdiClose,
} from "@mdi/js";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JiraCreateTaskProvider } from "@/providers/create-task/JiraCreateTaskProvider";
import { useWorkBreakdownDraft } from "@/hooks/useWorkBreakdownDraft";
import { usePatchWorkBreakdown } from "@/hooks/usePatchWorkBreakdown";
import { usePublishWorkBreakdown } from "@/hooks/usePublishWorkBreakdown";
import { useJiraIssueTypes } from "@/hooks/useJiraIssueTypes";
import { WorkBreakdownEditForm } from "./WorkBreakdownEditForm";
import { getIssueTypeIconPath } from "./task-form/create-task-utils";
import type { WorkItem, WorkItemType } from "@/types/workbreakdown";
import { cn } from "@/lib/utils";

/** Jira issue type name variants for matching (case-insensitive). Same as WorkBreakdownEditForm so icons match. */
const ISSUE_TYPE_NAME_VARIANTS: Record<WorkItemType, string[]> = {
  epic: ["Epic", "EPIC"],
  story: ["Story", "User Story", "Stories", "story"],
  task: ["Task", "Tasks", "task"],
  subtask: ["Sub-task", "Subtask", "Sub task", "sub-task", "subtask"],
};

type IssueTypeIconMap = Partial<Record<WorkItemType, string>>;
const IssueTypeIconContext = createContext<IssueTypeIconMap>({});

const WORK_ITEM_TYPES: { type: WorkItemType; label: string }[] = [
  { type: "epic", label: "Epic" },
  { type: "story", label: "Story" },
  { type: "task", label: "Task" },
  { type: "subtask", label: "Subtask" },
];

type WorkBreakdownPreviewViewProps = {
  draftId: string;
  projectId?: string;
  onBack: () => void;
};

/** Find a work item by id in the tree. */
function findItemInTree(items: WorkItem[], itemId: string): WorkItem | null {
  for (const it of items) {
    if (it.id === itemId) return it;
    const found = findItemInTree(it.children, itemId);
    if (found) return found;
  }
  return null;
}

/** Return path from root to the item (inclusive). Empty if not found. */
function findPathToItem(items: WorkItem[], itemId: string, acc: WorkItem[] = []): WorkItem[] {
  for (const it of items) {
    if (it.id === itemId) return [...acc, it];
    const found = findPathToItem(it.children, itemId, [...acc, it]);
    if (found.length > 0) return found;
  }
  return [];
}

/** Issue type icon matching Jira (same URL and size). Uses small size for consistent list appearance. */
function WorkItemIcon({
  type,
}: {
  type: WorkItem["type"];
  size?: "sm";
}) {
  const iconMap = useContext(IssueTypeIconContext);
  const jiraIconUrl = iconMap[type];
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const sizeClass = "size-5";

  if (jiraIconUrl) {
    return (
      <span
        className={cn("flex shrink-0 items-center justify-center rounded overflow-hidden", sizeClass)}
        title={typeLabel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={jiraIconUrl}
          alt={typeLabel}
          width={20}
          height={20}
          className="object-contain w-full h-full"
        />
      </span>
    );
  }

  const path = getIssueTypeIconPath(typeLabel);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded bg-muted text-muted-foreground",
        sizeClass,
      )}
      title={typeLabel}
    >
      <Icon path={path} size="sm" />
    </span>
  );
}

function SubtaskList({
  item,
  onEdit,
  onDelete,
  onAddChild,
  onPreview,
}: {
  item: WorkItem;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onAddChild: (item: WorkItem) => void;
  onPreview?: (item: WorkItem) => void;
}) {
  if (item.children.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 border-l-2 border-muted pl-4">
      {item.children.map((child) => (
        <li key={child.id} className="group flex items-start gap-2 rounded-r py-1.5 pr-2">
          <WorkItemIcon type={child.type} />
          <button
            type="button"
            onClick={() => onPreview?.(child)}
            className="min-w-0 flex-1 text-left hover:opacity-90"
          >
            <p className="font-medium text-foreground text-sm">{child.title}</p>
            {child.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {child.description}
              </p>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                colorScheme="neutral"
                className="shrink-0 opacity-0 group-hover:opacity-100 size-7"
                aria-label="Actions"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon path={mdiDotsVertical} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(child)}>
                <Icon path={mdiPencil} size="sm" className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(child)}>
                <Icon path={mdiDelete} size="sm" className="mr-2" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddChild(child)}>
                <Icon path={mdiPlus} size="sm" className="mr-2" />
                Add child
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}

function TaskCard({
  item,
  onEdit,
  onDelete,
  onAddChild,
  onPreview,
  defaultExpanded,
}: {
  item: WorkItem;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onAddChild: (item: WorkItem) => void;
  onPreview?: (item: WorkItem) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);
  const hasSubtasks = item.children.length > 0;
  const ac = item.metadata?.acceptanceCriteria as string[] | undefined;

  return (
    <div className="rounded-lg border border-(--color-blackAlpha-200) bg-card">
      <div
        className={cn(
          "flex items-start gap-3 p-3",
          (hasSubtasks || onPreview) && "cursor-pointer",
        )}
      >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasSubtasks) setExpanded((prev) => !prev);
            }}
            className="shrink-0 mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-expanded={expanded}
          >
            {hasSubtasks ? (
              <Icon path={expanded ? mdiChevronDown : mdiChevronRight} size="sm" />
            ) : (
              <span className="size-5 block" />
            )}
          </button>
          <WorkItemIcon type={item.type} />
          <button
            type="button"
            onClick={() => onPreview?.(item)}
            className="min-w-0 flex-1 space-y-1 text-left"
          >
            <p className="font-semibold text-foreground">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.description.replace(/\*\*[^*]+\*\*:?/g, "").trim().slice(0, 200)}
                {item.description.length > 200 ? "…" : ""}
              </p>
            )}
            {ac && ac.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 pt-1">
                {ac.slice(0, 3).map((c, i) => (
                  <li key={i} className="truncate">{c}</li>
                ))}
                {ac.length > 3 && <li>+{ac.length - 3} more</li>}
              </ul>
            )}
            {item.externalKey && (
              <p className="text-xs text-muted-foreground">{item.externalKey}</p>
            )}
          </button>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              colorScheme="neutral"
              className="shrink-0"
              aria-label="Actions"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon path={mdiDotsVertical} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Icon path={mdiPencil} size="sm" className="mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(item)}>
              <Icon path={mdiDelete} size="sm" className="mr-2" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddChild(item)}>
              <Icon path={mdiPlus} size="sm" className="mr-2" />
              Add child
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasSubtasks && expanded && (
        <div className="border-t border-(--color-blackAlpha-100) bg-muted/20 px-3 pb-3 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Subtasks ({item.children.length})
          </p>
          <SubtaskList
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onPreview={onPreview}
          />
        </div>
      )}
    </div>
  );
}

function StoryOrEpicCard({
  item,
  onEdit,
  onDelete,
  onAddChild,
  onPreview,
}: {
  item: WorkItem;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onAddChild: (item: WorkItem) => void;
  onPreview?: (item: WorkItem) => void;
}) {
  const hasTasks = item.children.length > 0;
  const label = item.type === "epic" ? "Epic" : "Story";
  return (
    <div className="flex flex-col rounded-xl border border-border-color bg-body-bg overflow-hidden">
      <div className="flex items-start gap-3 bg-primary/5 p-4">
        <WorkItemIcon type={item.type} />
          <button
            type="button"
            onClick={() => onPreview?.(item)}
            className="min-w-0 flex-1 space-y-1 text-left cursor-pointer"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {label}
            </p>
            <p className="font-semibold text-lg text-foreground">{item.title}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {item.description.replace(/\*\*[^*]+\*\*:?/g, " ").replace(/\s+/g, " ").trim().slice(0, 320)}
                {item.description.length > 320 ? "…" : ""}
              </p>
            )}
          </button>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              colorScheme="neutral"
              className="shrink-0"
              aria-label="Actions"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon path={mdiDotsVertical} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Icon path={mdiPencil} size="sm" className="mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(item)}>
              <Icon path={mdiDelete} size="sm" className="mr-2" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddChild(item)}>
              <Icon path={mdiPlus} size="sm" className="mr-2" />
              Add child
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasTasks && (
        <div className="border-t border-(--color-blackAlpha-100) p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tasks ({item.children.length})
          </p>
          <div className="space-y-3">
            {item.children.map((task) => (
              <TaskCard
                key={task.id}
                item={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                onPreview={onPreview}
                defaultExpanded={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EpicOrItemRow({
  item,
  onEdit,
  onDelete,
  onAddChild,
  onPreview,
}: {
  item: WorkItem;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onAddChild: (item: WorkItem) => void;
  onPreview?: (item: WorkItem) => void;
}) {
  if (item.type === "story" || item.type === "epic") {
    return (
      <StoryOrEpicCard
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddChild={onAddChild}
        onPreview={onPreview}
      />
    );
  }
  return (
    <TaskCard
      item={item}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddChild={onAddChild}
      onPreview={onPreview}
    />
  );
}

/** Build map from internal type to Jira issue type icon URL so breakdown uses same icons as Jira. */
function buildIssueTypeIconMap(issueTypes: { name: string; iconUrl?: string }[]): IssueTypeIconMap {
  const normalized = (s: string) => s.trim().toLowerCase();
  const map: IssueTypeIconMap = {};
  for (const [internal, names] of Object.entries(ISSUE_TYPE_NAME_VARIANTS)) {
    let found = issueTypes.find((it) =>
      names.some((want) => normalized(it.name) === normalized(want)),
    );
    if (!found && internal === "story") {
      found = issueTypes.find(
        (it) => normalized(it.name).includes("story") && !normalized(it.name).includes("sub"),
      );
    }
    if (found?.iconUrl) map[internal as WorkItemType] = found.iconUrl;
  }
  return map;
}

export function WorkBreakdownPreviewView({
  draftId,
  projectId,
  onBack,
}: WorkBreakdownPreviewViewProps) {
  const { data: draft, isLoading, isError, error } = useWorkBreakdownDraft(draftId);
  const patchMutation = usePatchWorkBreakdown(draftId);
  const publishMutation = usePublishWorkBreakdown(draftId);
  const { data: jiraIssueTypes = [] } = useJiraIssueTypes(projectId ?? null);
  const issueTypeIconMap = buildIssueTypeIconMap(jiraIssueTypes);

  const [editNode, setEditNode] = useState<WorkItem | null>(null);
  const [deleteNode, setDeleteNode] = useState<WorkItem | null>(null);
  const [addChildParent, setAddChildParent] = useState<WorkItem | null>(null);
  const [detailItem, setDetailItem] = useState<WorkItem | null>(null);
  const [publishResult, setPublishResult] = useState<{
    created: { itemId: string; key: string; title: string }[];
    errors: { itemId: string; title: string; message: string }[];
    status: string;
  } | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteNode) return;
    await patchMutation.mutateAsync({ op: "deleteNode", itemId: deleteNode.id });
    setDeleteNode(null);
  };

  const handleAddChild = async (parent: WorkItem, type: WorkItemType) => {
    const label = WORK_ITEM_TYPES.find((t) => t.type === type)?.label ?? type;
    await patchMutation.mutateAsync({
      op: "addChild",
      parentId: parent.id,
      item: { type, title: `New ${label}` },
    });
    setAddChildParent(null);
  };

  const handlePublishSuccess = (result: {
    created: unknown[];
    errors: unknown[];
    status: string;
  }) => {
    setPublishResult({
      created: result.created as { itemId: string; key: string; title: string }[],
      errors: result.errors as { itemId: string; title: string; message: string }[],
      status: result.status,
    });
  };

  if (isLoading) {
    return (
      <div className="wrapper space-y-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            colorScheme="neutral"
            onClick={onBack}
            className="shrink-0 -ml-1"
          >
            <Icon path={mdiArrowLeft} size="sm" />
            Back
          </Button>
        </div>
        <Card elevation="none" style="outline" padding="md">
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Spinner className="size-4" />
            Loading work breakdown…
          </div>
        </Card>
      </div>
    );
  }

  if (isError || !draft) {
    return (
      <div className="wrapper space-y-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            colorScheme="neutral"
            onClick={onBack}
            className="shrink-0 -ml-1"
          >
            <Icon path={mdiArrowLeft} size="sm" />
            Back
          </Button>
        </div>
        <Card elevation="none" style="outline" padding="md">
          <p className="text-destructive">
            {error?.message ?? "Failed to load work breakdown."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <IssueTypeIconContext.Provider value={issueTypeIconMap}>
    <div className="wrapper space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          colorScheme="neutral"
          onClick={onBack}
          className="shrink-0 -ml-1"
        >
          <Icon path={mdiArrowLeft} size="sm" />
          Back
        </Button>
        <span className="text-muted-foreground text-sm">
          Preview work breakdown
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Icon
          path={mdiFileDocumentOutline}
          size="default"
          className="text-muted-foreground"
        />
        <h2 className="text-lg font-semibold">Work breakdown</h2>
      </div>

      <div className="space-y-4">
          {draft.items.map((item) => (
            <EpicOrItemRow
              key={item.id}
              item={item}
              onEdit={setEditNode}
              onDelete={setDeleteNode}
              onAddChild={setAddChildParent}
              onPreview={setDetailItem}
            />
          ))}
      </div>

      {/* Task detail preview sheet */}
      <Sheet open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-[420px] flex flex-col gap-0 p-0 max-h-[88vh] top-[6vh] bottom-[6vh] h-[88vh] rounded-l-xl border-l border-t border-b border-border/80 shadow-xl",
          )}
        >
          {detailItem && (() => {
            const current = findItemInTree(draft.items, detailItem.id) ?? detailItem;
            const path = findPathToItem(draft.items, current.id);
            const showChildren = current.type !== "subtask";
            const ac = current.metadata?.acceptanceCriteria as string[] | undefined;
            const cleanDescription = current.description
              ? current.description.replace(/\*\*[^*]+\*\*:?/g, "").trim()
              : "";
            return (
              <>
                {path.length > 0 && (
                  <nav
                    aria-label="Breadcrumb"
                    className="shrink-0 pl-3 pr-12 py-2 bg-muted/40 border-b border-border/60"
                  >
                    <ol className="flex flex-wrap items-center gap-1 text-xs">
                      {path.map((item, i) => {
                        const isLast = i === path.length - 1;
                        const keyOrId = item.externalKey ?? item.id.slice(0, 8);
                        return (
                          <li key={item.id} className="flex items-center gap-1 min-w-0">
                            {i > 0 && (
                              <Icon path={mdiChevronRight} size="sm" className="shrink-0 text-muted-foreground size-3.5" />
                            )}
                            {isLast ? (
                              <span className="flex items-center gap-1.5 min-w-0 font-medium text-foreground">
                                <WorkItemIcon type={item.type} />
                                <span className="font-mono truncate" title={item.title}>{keyOrId}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className="flex items-center gap-1.5 min-w-0 text-muted-foreground hover:text-foreground rounded px-1 -mx-1 hover:bg-muted/60 font-mono"
                                title={item.title}
                              >
                                <WorkItemIcon type={item.type} />
                                <span className="truncate">{keyOrId}</span>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                )}
                <SheetHeader className="shrink-0 px-4 pt-4 pb-3 pr-12 border-b border-border/60 bg-card/50">
                  <div className="flex items-start gap-3 min-w-0">
                    <WorkItemIcon type={current.type} />
                    <div className="min-w-0 flex-1">
                      <SheetTitle className="text-base font-semibold leading-tight block truncate" title={current.title}>
                        {current.title}
                      </SheetTitle>
                      {current.externalKey && (
                        <span className="inline-block mt-1 text-xs font-mono text-muted-foreground">
                          {current.externalKey}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      colorScheme="neutral"
                      className="text-xs"
                      onClick={() => {
                        setEditNode(current);
                        setDetailItem(null);
                      }}
                    >
                      <Icon path={mdiPencil} size="sm" className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      colorScheme="neutral"
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteNode(current);
                        setDetailItem(null);
                      }}
                    >
                      <Icon path={mdiDelete} size="sm" className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {cleanDescription && (
                    <section className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {cleanDescription}
                      </p>
                    </section>
                  )}
                  {ac && ac.length > 0 && (
                    <section className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Acceptance criteria
                      </h4>
                      <ul className="text-sm text-foreground space-y-1.5">
                        {ac.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground shrink-0">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {showChildren && (
                    <section className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {current.type === "story" || current.type === "epic"
                            ? `Tasks (${current.children.length})`
                            : `Subtasks (${current.children.length})`}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          colorScheme="neutral"
                          className="size-7"
                          aria-label="Add child"
                          onClick={() => setAddChildParent(current)}
                        >
                          <Icon path={mdiPlus} size="sm" />
                        </Button>
                      </div>
                      {current.children.length > 0 ? (
                        <ul className="space-y-1">
                          {current.children.map((child) => (
                            <li key={child.id}>
                              <button
                                type="button"
                                onClick={() => setDetailItem(child)}
                                className="flex items-start gap-2 w-full text-left rounded-md py-2 px-2 -mx-1 hover:bg-background/80 border border-transparent hover:border-border/60 transition-colors"
                              >
                                <WorkItemIcon type={child.type} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground text-sm leading-tight">{child.title}</p>
                                  {child.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                      {child.description}
                                    </p>
                                  )}
                                </div>
                                <Icon path={mdiChevronRight} size="sm" className="shrink-0 text-muted-foreground mt-0.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">
                          No items yet. Use + to add one.
                        </p>
                      )}
                    </section>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {publishResult && (
        <Card elevation="none" style="outline" padding="md">
          <p className="font-medium">
            {publishResult.status === "completed"
              ? "Published successfully"
              : publishResult.status === "partial"
                ? "Partially published"
                : "Publish had errors"}
          </p>
          {publishResult.created.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Created: {publishResult.created.map((c) => c.key).join(", ")}
            </p>
          )}
          {publishResult.errors.length > 0 && (
            <ul className="text-sm text-destructive mt-2 space-y-1">
              {publishResult.errors.map((e) => (
                <li key={e.itemId}>
                  {e.title}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card elevation="none" style="outline" padding="md">
        {publishMutation.isError && (
          <Alert variant="danger" className="mb-3">
            <AlertDescription>
              {publishMutation.error?.message ?? "Publish failed."}
            </AlertDescription>
          </Alert>
        )}
        <Button
          type="button"
          colorScheme="primary"
          disabled={!projectId || publishMutation.isPending}
          onClick={() => {
            if (projectId) {
              publishMutation.mutate(
                { projectId },
                { onSuccess: handlePublishSuccess },
              );
            }
          }}
        >
          {publishMutation.isPending ? (
            <>
              <Spinner className="size-4 mr-2" />
              Publishing…
            </>
          ) : (
            "Publish to platform"
          )}
        </Button>
        {!projectId && (
          <p className="mt-2 text-sm text-muted-foreground">
            Select a project from the Create task screen to publish.
          </p>
        )}
      </Card>

      <Dialog open={!!editNode} onOpenChange={(open) => !open && setEditNode(null)}>
        <DialogContent
          size="md"
          hideCloseButton
          className="mx-4 flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl border border-border/80 p-0 shadow-xl sm:mx-6"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base">Edit item</DialogTitle>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              colorScheme="neutral"
              aria-label="Close"
              className="-mr-1"
              onClick={() => setEditNode(null)}
            >
              <Icon path={mdiClose} size="sm" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {editNode && projectId && (
              <JiraCreateTaskProvider projectId={projectId}>
                <WorkBreakdownEditForm
                  key={editNode.id}
                  node={editNode}
                  patchMutation={patchMutation}
                  onCancel={() => setEditNode(null)}
                  onSaved={() => setEditNode(null)}
                />
              </JiraCreateTaskProvider>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteNode} onOpenChange={(open) => !open && setDeleteNode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteNode?.title} and its children will be removed from the draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!addChildParent}
        onOpenChange={(open) => !open && setAddChildParent(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add child</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {WORK_ITEM_TYPES.map(({ type, label }) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                colorScheme="neutral"
                className="justify-start gap-2"
                onClick={() => handleAddChild(addChildParent!, type)}
              >
                <WorkItemIcon type={type} />
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </IssueTypeIconContext.Provider>
  );
}
