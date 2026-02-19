"use client";

import { useState } from "react";
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
import { WorkBreakdownEditForm } from "./WorkBreakdownEditForm";
import { getIssueTypeIconPath } from "./task-form/create-task-utils";
import type { WorkItem, WorkItemType } from "@/types/workbreakdown";
import { cn } from "@/lib/utils";

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

function WorkItemIcon({
  type,
  size = "default",
}: {
  type: WorkItem["type"];
  size?: "default" | "sm";
}) {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const path = getIssueTypeIconPath(typeLabel);
  const sizeClass = size === "sm" ? "size-5" : "size-8";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded bg-muted text-muted-foreground",
        sizeClass,
      )}
      title={typeLabel}
    >
      <Icon path={path} size={size === "sm" ? "sm" : "default"} />
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

export function WorkBreakdownPreviewView({
  draftId,
  projectId,
  onBack,
}: WorkBreakdownPreviewViewProps) {
  const { data: draft, isLoading, isError, error } = useWorkBreakdownDraft(draftId);
  const patchMutation = usePatchWorkBreakdown(draftId);
  const publishMutation = usePublishWorkBreakdown(draftId);

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
          className="w-full sm:max-w-md flex flex-col p-0"
        >
          {detailItem && (() => {
            const current = findItemInTree(draft.items, detailItem.id) ?? detailItem;
            const path = findPathToItem(draft.items, current.id);
            const typeLabel = current.type.charAt(0).toUpperCase() + current.type.slice(1);
            const showChildren = current.type !== "subtask";
            const ac = current.metadata?.acceptanceCriteria as string[] | undefined;
            return (
              <>
                {path.length > 0 && (
                  <nav
                    aria-label="Breadcrumb"
                    className="shrink-0 border-b border-(--color-blackAlpha-200) px-4 py-2 bg-muted/30"
                  >
                    <ol className="flex flex-wrap items-center gap-1 text-sm">
                      {path.map((item, i) => {
                        const isLast = i === path.length - 1;
                        const label = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                        const displayTitle = item.title.length > 28 ? item.title.slice(0, 25) + "…" : item.title;
                        const keyOrId = item.externalKey ?? item.id.slice(0, 12);
                        return (
                          <li key={item.id} className="flex items-center gap-1 min-w-0">
                            {i > 0 && (
                              <Icon path={mdiChevronRight} size="sm" className="shrink-0 text-muted-foreground" />
                            )}
                            {isLast ? (
                              <span className="flex items-center gap-1.5 min-w-0 truncate font-medium">
                                <WorkItemIcon type={item.type} size="sm" />
                                <span className="truncate" title={item.title}>
                                  {label}: {displayTitle}
                                </span>
                                <span className="text-muted-foreground shrink-0">({keyOrId})</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className="flex items-center gap-1.5 min-w-0 truncate text-muted-foreground hover:text-foreground hover:underline"
                              >
                                <WorkItemIcon type={item.type} size="sm" />
                                <span className="truncate" title={item.title}>
                                  {label}: {displayTitle}
                                </span>
                                <span className="shrink-0">({keyOrId})</span>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                )}
                <SheetHeader className="shrink-0 border-b border-(--color-blackAlpha-200) px-4 py-4">
                  <div className="flex items-start gap-3 pr-8">
                    <WorkItemIcon type={current.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {typeLabel}
                      </p>
                      <SheetTitle className="text-lg mt-0.5">{current.title}</SheetTitle>
                      {current.externalKey && (
                        <p className="text-xs text-muted-foreground mt-1">{current.externalKey}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      colorScheme="neutral"
                      onClick={() => {
                        setEditNode(current);
                        setDetailItem(null);
                      }}
                    >
                      <Icon path={mdiPencil} size="sm" className="mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      colorScheme="neutral"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleteNode(current);
                        setDetailItem(null);
                      }}
                    >
                      <Icon path={mdiDelete} size="sm" className="mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {current.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                        Description
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {current.description.replace(/\*\*[^*]+\*\*:?/g, "").trim()}
                      </p>
                    </div>
                  )}
                  {ac && ac.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                        Acceptance criteria
                      </p>
                      <ul className="text-sm text-foreground list-disc list-inside space-y-1">
                        {ac.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {showChildren && (
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {current.type === "story" || current.type === "epic"
                            ? `Tasks (${current.children.length})`
                            : `Subtasks (${current.children.length})`}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          colorScheme="neutral"
                          className="shrink-0 size-8"
                          aria-label="Add child"
                          onClick={() => setAddChildParent(current)}
                        >
                          <Icon path={mdiPlus} size="sm" />
                        </Button>
                      </div>
                      {current.children.length > 0 ? (
                        <ul className="space-y-2 border-l-2 border-muted pl-3">
                          {current.children.map((child) => (
                            <li key={child.id}>
                              <button
                                type="button"
                                onClick={() => setDetailItem(child)}
                                className="flex items-start gap-2 w-full text-left rounded-md py-2 pr-2 hover:bg-muted/50"
                              >
                                <WorkItemIcon type={child.type} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground text-sm">{child.title}</p>
                                  {child.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                      {child.description}
                                    </p>
                                  )}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">
                          No items yet. Use the + button to add one.
                        </p>
                      )}
                    </div>
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
          size="lg"
          hideCloseButton
          className="flex max-h-[90vh] flex-col gap-0 p-0"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-(--color-blackAlpha-200) px-6 py-4">
            <DialogHeader className="p-0">
              <DialogTitle>Edit item</DialogTitle>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              colorScheme="neutral"
              aria-label="Close"
              onClick={() => setEditNode(null)}
            >
              <Icon path={mdiClose} size="sm" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
  );
}
