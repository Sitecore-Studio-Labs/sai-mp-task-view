"use client";

import {
  mdiArrowLeft,
  mdiChevronDown,
  mdiChevronRight,
  mdiClose,
  mdiDelete,
  mdiDotsVertical,
  mdiFileDocumentOutline,
  mdiPencil,
  mdiPlus,
} from "@mdi/js";
import type { WorkItem, WorkItemType } from "@mp/ai";
import { cn } from "@mp/shared";
import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

import { usePatchWorkBreakdown } from "../../hooks/usePatchWorkBreakdown";
import { usePlatformIssueTypes } from "../../hooks/usePlatformIssueTypes";
import { usePublishWorkBreakdown } from "../../hooks/usePublishWorkBreakdown";
import { useWorkBreakdownDraft } from "../../hooks/useWorkBreakdownDraft";
import { Alert, AlertDescription } from "../ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Icon } from "../ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Spinner } from "../ui/spinner";
import { getIssueTypeIconPath } from "./task-form/create-task-utils";
import { WorkBreakdownEditForm } from "./WorkBreakdownEditForm";

/** Issue type name variants for icon matching (case-insensitive). */
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

export type EditFormWrapperProps = {
  projectId: string;
  projectKey: string;
  children: ReactNode;
};

export type WorkBreakdownPreviewViewProps = {
  draftId: string;
  projectId?: string;
  projectKey?: string;
  onBack: () => void;
  /**
   * Render prop: wraps the edit form with a platform-specific CreateTask provider.
   * When omitted the edit form is rendered without a provider wrapper.
   */
  editFormWrapper?: (props: EditFormWrapperProps) => ReactNode;
};

function findItemInTree(items: WorkItem[], itemId: string): WorkItem | null {
  for (const it of items) {
    if (it.id === itemId) return it;
    const found = findItemInTree(it.children, itemId);
    if (found) return found;
  }
  return null;
}

function findPathToItem(items: WorkItem[], itemId: string, acc: WorkItem[] = []): WorkItem[] {
  for (const it of items) {
    if (it.id === itemId) return [...acc, it];
    const found = findPathToItem(it.children, itemId, [...acc, it]);
    if (found.length > 0) return found;
  }
  return [];
}

function WorkItemIcon({ type }: { type: WorkItem["type"] }) {
  const iconMap = useContext(IssueTypeIconContext);
  const jiraIconUrl = iconMap[type];
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const sizeClass = "size-5";

  if (jiraIconUrl) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded",
          sizeClass,
        )}
        title={typeLabel}
      >
        {}
        <img
          src={jiraIconUrl}
          alt={typeLabel}
          width={20}
          height={20}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  const path = getIssueTypeIconPath(typeLabel);
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded",
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
    <ul className="border-muted mt-2 space-y-1 border-l-2 pl-4">
      {item.children.map((child) => (
        <li key={child.id} className="group flex items-start gap-2 rounded-r py-1.5 pr-2">
          <WorkItemIcon type={child.type} />
          <button
            type="button"
            onClick={() => onPreview?.(child)}
            className="min-w-0 flex-1 text-left hover:opacity-90"
          >
            <p className="text-foreground text-sm font-medium">{child.title}</p>
            {child.description && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
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
                className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
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
    <div className="bg-card rounded-lg border border-(--color-blackAlpha-200)">
      <div
        className={cn("flex items-start gap-3 p-3", (hasSubtasks || onPreview) && "cursor-pointer")}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasSubtasks) setExpanded((prev) => !prev);
          }}
          className="text-muted-foreground hover:bg-muted hover:text-foreground mt-0.5 shrink-0 rounded p-0.5"
          aria-expanded={expanded}
        >
          {hasSubtasks ? (
            <Icon path={expanded ? mdiChevronDown : mdiChevronRight} size="sm" />
          ) : (
            <span className="block size-5" />
          )}
        </button>
        <WorkItemIcon type={item.type} />
        <button
          type="button"
          onClick={() => onPreview?.(item)}
          className="min-w-0 flex-1 space-y-1 text-left"
        >
          <p className="text-foreground font-semibold">{item.title}</p>
          {item.description && (
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {item.description
                .replace(/\*\*[^*]+\*\*:?/g, "")
                .trim()
                .slice(0, 200)}
              {item.description.length > 200 ? "…" : ""}
            </p>
          )}
          {ac && ac.length > 0 && (
            <ul className="text-muted-foreground list-inside list-disc space-y-0.5 pt-1 text-xs">
              {ac.slice(0, 3).map((c, i) => (
                <li key={i} className="truncate">
                  {c}
                </li>
              ))}
              {ac.length > 3 && <li>+{ac.length - 3} more</li>}
            </ul>
          )}
          {item.externalKey && <p className="text-muted-foreground text-xs">{item.externalKey}</p>}
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
        <div className="bg-muted/20 border-t border-(--color-blackAlpha-100) px-3 pt-2 pb-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
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
    <div className="border-border-color bg-body-bg flex flex-col overflow-hidden rounded-xl border">
      <div className="bg-primary/5 flex items-start gap-3 p-4">
        <WorkItemIcon type={item.type} />
        <button
          type="button"
          onClick={() => onPreview?.(item)}
          className="min-w-0 flex-1 cursor-pointer space-y-1 text-left"
        >
          <p className="text-primary text-xs font-medium tracking-wide uppercase">{label}</p>
          <p className="text-foreground text-lg font-semibold">{item.title}</p>
          {item.description && (
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {item.description
                .replace(/\*\*[^*]+\*\*:?/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 320)}
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
        <div className="space-y-3 border-t border-(--color-blackAlpha-100) p-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
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
  projectKey,
  onBack,
  editFormWrapper,
}: WorkBreakdownPreviewViewProps) {
  const { data: draft, isLoading, isError, error } = useWorkBreakdownDraft(draftId);
  const patchMutation = usePatchWorkBreakdown(draftId);
  const publishMutation = usePublishWorkBreakdown(draftId);
  const { data: issueTypes = [] } = usePlatformIssueTypes(projectId ?? null);
  const issueTypeIconMap = buildIssueTypeIconMap(issueTypes);

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
            className="-ml-1 shrink-0"
          >
            <Icon path={mdiArrowLeft} size="sm" />
            Back
          </Button>
        </div>
        <Card elevation="none" style="outline" padding="md">
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8">
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
            className="-ml-1 shrink-0"
          >
            <Icon path={mdiArrowLeft} size="sm" />
            Back
          </Button>
        </div>
        <Card elevation="none" style="outline" padding="md">
          <p className="text-destructive">{error?.message ?? "Failed to load work breakdown."}</p>
        </Card>
      </div>
    );
  }

  const editFormContent =
    editNode && projectId && projectKey ? (
      <WorkBreakdownEditForm
        key={editNode.id}
        node={editNode}
        patchMutation={patchMutation}
        onCancel={() => setEditNode(null)}
        onSaved={() => setEditNode(null)}
      />
    ) : null;

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
            className="-ml-1 shrink-0"
          >
            <Icon path={mdiArrowLeft} size="sm" />
            Back
          </Button>
          <span className="text-muted-foreground text-sm">Preview work breakdown</span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <Icon path={mdiFileDocumentOutline} size="default" className="text-muted-foreground" />
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
              "border-border/80 top-[6vh] bottom-[6vh] flex h-[88vh] max-h-[88vh] w-full flex-col gap-0 rounded-l-xl border-t border-b border-l p-0 shadow-xl sm:max-w-[420px]",
            )}
          >
            {detailItem &&
              (() => {
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
                        className="bg-muted/40 border-border/60 shrink-0 border-b py-2 pr-12 pl-3"
                      >
                        <ol className="flex flex-wrap items-center gap-1 text-xs">
                          {path.map((item, i) => {
                            const isLast = i === path.length - 1;
                            const keyOrId = item.externalKey ?? item.id.slice(0, 8);
                            return (
                              <li key={item.id} className="flex min-w-0 items-center gap-1">
                                {i > 0 && (
                                  <Icon
                                    path={mdiChevronRight}
                                    size="sm"
                                    className="text-muted-foreground size-3.5 shrink-0"
                                  />
                                )}
                                {isLast ? (
                                  <span className="text-foreground flex min-w-0 items-center gap-1.5 font-medium">
                                    <WorkItemIcon type={item.type} />
                                    <span className="truncate font-mono" title={item.title}>
                                      {keyOrId}
                                    </span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDetailItem(item)}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted/60 -mx-1 flex min-w-0 items-center gap-1.5 rounded px-1 font-mono"
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
                    <SheetHeader className="border-border/60 bg-card/50 shrink-0 border-b px-4 pt-4 pr-12 pb-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <WorkItemIcon type={current.type} />
                        <div className="min-w-0 flex-1">
                          <SheetTitle
                            className="block truncate text-base leading-tight font-semibold"
                            title={current.title}
                          >
                            {current.title}
                          </SheetTitle>
                          {current.externalKey && (
                            <span className="text-muted-foreground mt-1 inline-block font-mono text-xs">
                              {current.externalKey}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
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
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
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
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                      {cleanDescription && (
                        <section className="border-border/60 bg-muted/20 rounded-lg border p-3">
                          <h4 className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                            Description
                          </h4>
                          <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                            {cleanDescription}
                          </p>
                        </section>
                      )}
                      {ac && ac.length > 0 && (
                        <section className="border-border/60 bg-muted/20 rounded-lg border p-3">
                          <h4 className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                            Acceptance criteria
                          </h4>
                          <ul className="text-foreground space-y-1.5 text-sm">
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
                        <section className="border-border/60 bg-muted/20 rounded-lg border p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
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
                                    className="hover:bg-background/80 hover:border-border/60 -mx-1 flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-2 text-left transition-colors"
                                  >
                                    <WorkItemIcon type={child.type} />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-foreground text-sm leading-tight font-medium">
                                        {child.title}
                                      </p>
                                      {child.description && (
                                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                          {child.description}
                                        </p>
                                      )}
                                    </div>
                                    <Icon
                                      path={mdiChevronRight}
                                      size="sm"
                                      className="text-muted-foreground mt-0.5 shrink-0"
                                    />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground py-2 text-xs">
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
              <p className="text-muted-foreground mt-1 text-sm">
                Created: {publishResult.created.map((c) => c.key).join(", ")}
              </p>
            )}
            {publishResult.errors.length > 0 && (
              <ul className="text-destructive mt-2 space-y-1 text-sm">
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
                publishMutation.mutate({ projectId }, { onSuccess: handlePublishSuccess });
              }
            }}
          >
            {publishMutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Publishing…
              </>
            ) : (
              "Publish to platform"
            )}
          </Button>
          {!projectId && (
            <p className="text-muted-foreground mt-2 text-sm">
              Select a project from the Create task screen to publish.
            </p>
          )}
        </Card>

        <Dialog open={!!editNode} onOpenChange={(open) => !open && setEditNode(null)}>
          <DialogContent
            size="md"
            hideCloseButton
            className="border-border/80 mx-4 flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-xl sm:mx-6"
          >
            <div className="border-border/60 bg-muted/30 flex shrink-0 items-center justify-between border-b px-5 py-3">
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
              {editNode &&
                projectId &&
                projectKey &&
                (editFormWrapper
                  ? editFormWrapper({ projectId, projectKey, children: editFormContent })
                  : editFormContent)}
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

        <Dialog open={!!addChildParent} onOpenChange={(open) => !open && setAddChildParent(null)}>
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
