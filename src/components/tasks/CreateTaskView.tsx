"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { format, startOfDay } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  mdiCalendarBlankOutline,
  mdiFormatListChecks,
  mdiFlag,
  mdiArrowLeft,
  mdiBug,
  mdiBookOpen,
  mdiStar,
  mdiChevronDown,
  mdiCloudUpload,
  mdiClose,
  mdiFileDocumentOutline,
} from "@mdi/js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useJiraIssueTypes } from "@/hooks/useJiraIssueTypes";
import { useJiraPriorities } from "@/hooks/useJiraPriorities";
import { useJiraAssignees } from "@/hooks/useJiraAssignees";
import { useJiraCurrentUser } from "@/hooks/useJiraCurrentUser";
import { useJiraProjectIssues } from "@/hooks/useJiraProjectIssues";
import { useCreateJiraTask } from "@/hooks/useCreateJiraTask";
import { apiClient } from "@/lib/axiosClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { JiraUser } from "@/types/jira";
import type { JiraIssueOption } from "@/types/jira";

const ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;
const PARENT_ISSUE_SEARCH_DEBOUNCE_MS = 300;

// Jira Cloud: default max 1GB per file (we use 50MB for better UX). Allow common safe types; block executables.
const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = new Set(
  [
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "txt", "csv", "rtf", "md",
    "zip", "rar", "7z",
    "json", "xml", "yaml", "yml",
  ].map((e) => e.toLowerCase()),
);
const BLOCKED_EXTENSIONS = new Set(
  ["exe", "bat", "cmd", "sh", "ps1", "vbs", "js", "jar", "msi", "dll", "scr"].map((e) => e.toLowerCase()),
);

type AttachmentItem = { id: string; file: File; addedAt: Date; objectUrl?: string };

/** Uploads files in the background after task create (one at a time). Shows toast on failure with Retry. */
function uploadAttachmentsInBackground(taskKey: string, files: File[]): void {
  const attempt = (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient
      .post(`/jira/issues/${taskKey}/attachments`, formData, { timeout: 95_000 })
      .then(() => {})
      .catch((err: { response?: { data?: { error?: string } }; message?: string }) => {
        const msg =
          err?.response?.data?.error ?? err?.message ?? "Upload failed.";
        toast.error(
          `Task ${taskKey} was created, but attaching "${file.name}" failed. ${msg}`,
          {
            action: {
              label: "Retry",
              onClick: () => attempt(file),
            },
          },
        );
      });
  };
  void files.reduce<Promise<void>>(
    (prev, file) => prev.then(() => attempt(file)),
    Promise.resolve(),
  );
}

/**
 * Extracts inline base64 images from description HTML and returns modified HTML plus File[] to upload.
 * Replaces each <img src="data:..."> with "[Image: filename]" so server ADF conversion works.
 */
async function extractDescriptionImages(html: string): Promise<{
  modifiedHtml: string;
  files: File[];
}> {
  const files: File[] = [];
  const dataUrlRegex =
    /<img\s[^>]*src=["'](data:image\/([^;]+);base64,([^"']+))["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  const parts: string[] = [];

  while ((match = dataUrlRegex.exec(html)) !== null) {
    parts.push(html.slice(lastIndex, match.index));
    lastIndex = dataUrlRegex.lastIndex;
    const mimeSubtype = (match[2] || "png").toLowerCase();
    const base64 = match[3];
    const altMatch = match[0].match(/\balt=["']([^"']*)["']/i);
    const baseName = altMatch?.[1]?.trim() || `image-${files.length + 1}`;
    const ext = mimeSubtype === "jpeg" ? "jpg" : mimeSubtype === "svg+xml" ? "svg" : mimeSubtype;
    const fileName = /\.\w+$/.test(baseName) ? baseName : `${baseName}.${ext}`;
    const safeName = fileName.replace(/[^\w.\-]/g, "_");
    const mimeType = `image/${mimeSubtype}`;
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      files.push(new File([blob], safeName, { type: mimeType }));
    } catch {
      parts.push(match[0]);
      continue;
    }
    parts.push("(Image: ", fileName, " — see Attachments)");
  }

  parts.push(html.slice(lastIndex));
  return { modifiedHtml: parts.join(""), files };
}

function getFileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `File "${file.name}" exceeds 50MB limit`;
  }
  const ext = getFileExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) return `File type .${ext} is not allowed`;
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return `File type .${ext} is not allowed. Allowed: images, PDF, Office, txt, csv, zip, etc.`;
  }
  return null;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function getIssueTypeIconPath(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bug")) return mdiBug;
  if (n.includes("story")) return mdiBookOpen;
  if (n.includes("epic")) return mdiStar;
  return mdiFormatListChecks;
}

/** Allowed parent issue type names for a given child issue type (Jira hierarchy). */
function getAllowedParentIssueTypeNames(childIssueTypeName: string): Set<string> {
  const n = childIssueTypeName.toLowerCase();
  if (n.includes("subtask") || n === "sub-task") return new Set(["Story", "Task", "Bug", "Sub-task", "Subtask"]);
  if (n.includes("story")) return new Set(["Epic"]);
  if (n.includes("task") && !n.includes("sub")) return new Set(["Epic"]);
  if (n.includes("bug")) return new Set(["Epic"]);
  return new Set();
}

export type CreateTaskFormValues = {
  issueTypeId: string;
  summary: string;
  description: string;
  priority: string;
  parentIssueKey: string;
  assignee: string;
  dueDate: Date | null;
};

const defaultValues: CreateTaskFormValues = {
  issueTypeId: "",
  summary: "",
  description: "",
  priority: "",
  parentIssueKey: "",
  assignee: "",
  dueDate: null,
};

type CreateTaskViewProps = {
  selectedProjectId: string;
  onBack: () => void;
  onSuccess?: () => void;
};

export function CreateTaskView({ selectedProjectId, onBack, onSuccess }: CreateTaskViewProps) {
  const createTask = useCreateJiraTask();

  const form = useForm<CreateTaskFormValues>({
    defaultValues,
    mode: "onChange",
  });

  const { data: issueTypes = [], isLoading: issueTypesLoading } =
    useJiraIssueTypes(selectedProjectId);
  const { data: priorities = [] } = useJiraPriorities();

  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeSearchDebounced, setAssigneeSearchDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setAssigneeSearchDebounced(assigneeSearch), ASSIGNEE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [assigneeSearch]);

  const { data: assignees = [], isLoading: assigneesLoading } = useJiraAssignees(
    selectedProjectId,
    assigneeSearchDebounced,
  );
  const { data: currentUser } = useJiraCurrentUser();

  const [parentIssueSearch, setParentIssueSearch] = useState("");
  const [parentIssueSearchDebounced, setParentIssueSearchDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setParentIssueSearchDebounced(parentIssueSearch), PARENT_ISSUE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [parentIssueSearch]);

  const { data: parentIssues = [], isLoading: parentIssuesLoading } = useJiraProjectIssues(
    selectedProjectId,
    parentIssueSearchDebounced,
  );

  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [parentIssueOpen, setParentIssueOpen] = useState(false);
  const [selectedAssigneeUser, setSelectedAssigneeUser] = useState<JiraUser | null>(null);
  const [selectedParentIssue, setSelectedParentIssue] = useState<JiraIssueOption | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentItem[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const assigneeValue = useWatch({ control: form.control, name: "assignee", defaultValue: "" });
  const parentIssueKeyValue = useWatch({ control: form.control, name: "parentIssueKey", defaultValue: "" });
  const issueTypeIdValue = useWatch({ control: form.control, name: "issueTypeId", defaultValue: "" });
  const selectedIssueTypeName = issueTypes.find((it) => it.id === issueTypeIdValue)?.name ?? "";
  const allowedParentTypeNames = getAllowedParentIssueTypeNames(selectedIssueTypeName);
  const filteredParentIssues =
    allowedParentTypeNames.size === 0
      ? []
      : parentIssues.filter(
          (i) => i.issueType?.name && allowedParentTypeNames.has(i.issueType!.name),
        );
  const displayAssignee =
    assigneeValue === ""
      ? null
      : selectedAssigneeUser ?? assignees.find((u) => u.accountId === assigneeValue) ?? null;
  const displayParentIssue =
    parentIssueKeyValue === ""
      ? null
      : selectedParentIssue ?? parentIssues.find((i) => i.key === parentIssueKeyValue) ?? null;

  useEffect(() => {
    if (!issueTypeIdValue || !parentIssueKeyValue || !displayParentIssue?.issueType?.name) return;
    const allowed = getAllowedParentIssueTypeNames(selectedIssueTypeName);
    if (!allowed.has(displayParentIssue.issueType.name)) {
      form.setValue("parentIssueKey", "");
      queueMicrotask(() => setSelectedParentIssue(null));
    }
  }, [issueTypeIdValue, selectedIssueTypeName, parentIssueKeyValue, displayParentIssue?.issueType?.name, form]);

  const prevProjectIdRef = useRef(selectedProjectId);
  useEffect(() => {
    if (prevProjectIdRef.current !== selectedProjectId) {
      prevProjectIdRef.current = selectedProjectId;
      form.setValue("parentIssueKey", "");
      queueMicrotask(() => setSelectedParentIssue(null));
    }
  }, [selectedProjectId, form]);

  const addAttachmentFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setAttachmentError(null);
    const next: AttachmentItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const err = validateAttachmentFile(file);
      if (err) {
        setAttachmentError(err);
        return;
      }
      const item: AttachmentItem = {
        id: `${file.name}-${file.size}-${Date.now()}-${i}`,
        file,
        addedAt: new Date(),
      };
      if (isImageFile(file)) item.objectUrl = URL.createObjectURL(file);
      next.push(item);
    }
    setAttachmentFiles((prev) => [...prev, ...next]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachmentFiles((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((a) => a.id !== id);
    });
    setAttachmentError(null);
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    const descriptionTrimmed = values.description?.trim() ?? "";
    const isHtml = descriptionTrimmed.startsWith("<");
    const { modifiedHtml, files: descriptionImageFiles } = isHtml
      ? await extractDescriptionImages(descriptionTrimmed)
      : { modifiedHtml: descriptionTrimmed, files: [] };

    const payload = {
      projectId: selectedProjectId,
      issueTypeId: values.issueTypeId,
      summary: values.summary.trim(),
      description: modifiedHtml || undefined,
      priority: values.priority?.trim() || undefined,
      parentIssueKey: values.parentIssueKey?.trim() || undefined,
      assignee: values.assignee?.trim() || undefined,
      dueDate: values.dueDate
        ? format(values.dueDate, "yyyy-MM-dd")
        : undefined,
    };
    try {
      const task = await createTask.mutateAsync(payload);
      const formFiles = attachmentFiles.map((a) => a.file);
      const allFilesToUpload = [...formFiles, ...descriptionImageFiles];
      form.reset(defaultValues);
      setSelectedParentIssue(null);
      attachmentFiles.forEach((a) => {
        if (a.objectUrl) URL.revokeObjectURL(a.objectUrl);
      });
      setAttachmentFiles([]);
      setAttachmentError(null);
      createTask.reset();
      onSuccess?.();
      if (allFilesToUpload.length > 0) {
        uploadAttachmentsInBackground(task.key, allFilesToUpload);
      }
    } catch {
      // Error shown via createTask.isError
    }
  });

  const errorMessage = createTask.isError
    ? ((createTask.error as Error)?.message ??
      "Failed to create task, please try again.")
    : null;

  return (
    <div className="wrapper space-y-4">
      {/* Back navigation – feels like leaving a sub-page */}
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
        <span className="text-muted-foreground text-sm">Create Jira Task</span>
      </div>

      <Card elevation="none" style="outline" padding="md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Issue Type */}
          <div className="space-y-2">
            <Label htmlFor="issueTypeId">Issue Type</Label>
            <Controller
              name="issueTypeId"
              control={form.control}
              rules={{ required: "Issue type is required" }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={issueTypesLoading}
                >
                  <SelectTrigger id="issueTypeId" className="w-full font-normal text-foreground border-(--color-blackAlpha-300)">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        <span className="flex items-center gap-2">
                          {it.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Jira issue type icon URL
                            <img
                              src={it.iconUrl}
                              alt=""
                              className="size-4 object-contain shrink-0"
                            />
                          ) : (
                            <Icon
                              path={getIssueTypeIconPath(it.name)}
                              size="sm"
                              className="text-muted-foreground shrink-0"
                            />
                          )}
                          {it.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.issueTypeId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.issueTypeId.message}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Controller
              name="summary"
              control={form.control}
              rules={{
                required: "Summary is required",
                minLength: { value: 1, message: "Summary is required" },
              }}
              render={({ field }) => (
                <Input
                  id="summary"
                  placeholder="e.g. Design new homepage layout"
                  className="border-(--color-blackAlpha-300)"
                  {...field}
                />
              )}
            />
            {form.formState.errors.summary && (
              <p className="text-sm text-destructive">
                {form.formState.errors.summary.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <p className="text-xs text-muted-foreground">
              Images you add here will be uploaded as attachments to the issue.
            </p>
            <Controller
              name="description"
              control={form.control}
              render={({ field }) => (
                <RichTextEditor
                  id="description"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Enter task description…"
                  className="min-h-20 border-(--color-blackAlpha-300)"
                />
              )}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Controller
              name="priority"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priority" className="w-full font-normal text-foreground border-(--color-blackAlpha-300)">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- external Jira icon URL
                            <img
                              src={p.iconUrl}
                              alt=""
                              className="size-4 object-contain"
                            />
                          ) : (
                            <Icon
                              path={mdiFlag}
                              size="sm"
                              className="text-muted-foreground"
                            />
                          )}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Parent issue (optional – standalone if not set) */}
          <div className="space-y-2">
            <Label htmlFor="parentIssueKey">Parent issue</Label>
            {selectedIssueTypeName && allowedParentTypeNames.size > 0 && (
              <p className="text-xs text-muted-foreground">
                Only issues of type {[...allowedParentTypeNames].join(", ")} can be parents for {selectedIssueTypeName}.
              </p>
            )}
            <Controller
              name="parentIssueKey"
              control={form.control}
              render={({ field }) => (
                <Popover
                  open={parentIssueOpen}
                  onOpenChange={(open) => {
                    setParentIssueOpen(open);
                    if (!open) setParentIssueSearch("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="parentIssueKey"
                      type="button"
                      variant="outline"
                      colorScheme="neutral"
                      className={cn(
                        "w-full justify-between h-10 rounded-md border border-(--color-blackAlpha-300) px-3 py-2 font-normal text-foreground",
                        !displayParentIssue && "text-muted-foreground",
                      )}
                    >
                      {displayParentIssue ? (
                        <span className="flex items-center gap-2 truncate">
                          {displayParentIssue.issueType?.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Jira issue type icon URL
                            <img
                              src={displayParentIssue.issueType.iconUrl}
                              alt=""
                              className="size-4 shrink-0 object-contain"
                            />
                          ) : (
                            <Icon
                              path={getIssueTypeIconPath(displayParentIssue.issueType?.name ?? "")}
                              size="sm"
                              className="shrink-0 text-muted-foreground"
                            />
                          )}
                          <span className="min-w-0 truncate font-mono text-sm">{displayParentIssue.key} – {displayParentIssue.summary}</span>
                        </span>
                      ) : (
                        "None (standalone issue)"
                      )}
                      <Icon path={mdiChevronDown} size="default" className="shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                    <Command filter={() => 1} className="rounded-lg border-0 shadow-none">
                      <div className="flex items-center border-b px-2">
                        <Input
                          placeholder="Search by key or summary..."
                          value={parentIssueSearch}
                          onChange={(e) => setParentIssueSearch(e.target.value)}
                          className="h-9 border-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                      <CommandList className="max-h-64">
                        <CommandEmpty>
                          {parentIssuesLoading ? "Searching..." : allowedParentTypeNames.size === 0 ? (selectedIssueTypeName ? `${selectedIssueTypeName} does not support a parent.` : "Select an issue type first.") : "No issues found."}
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              field.onChange("");
                              setSelectedParentIssue(null);
                              setParentIssueOpen(false);
                            }}
                          >
                            <span className="text-muted-foreground">None (standalone issue)</span>
                          </CommandItem>
                          {filteredParentIssues.map((issue) => (
                            <CommandItem
                              key={issue.id}
                              value={`${issue.key}-${issue.summary}`}
                              onSelect={() => {
                                field.onChange(issue.key);
                                setSelectedParentIssue(issue);
                                setParentIssueOpen(false);
                              }}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {issue.issueType?.iconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- Jira issue type icon URL
                                  <img
                                    src={issue.issueType.iconUrl}
                                    alt=""
                                    className="size-4 shrink-0 object-contain"
                                  />
                                ) : (
                                  <Icon
                                    path={getIssueTypeIconPath(issue.issueType?.name ?? "")}
                                    size="sm"
                                    className="shrink-0 text-muted-foreground"
                                  />
                                )}
                                <span className="font-mono text-sm shrink-0">{issue.key}</span>
                                <span className="truncate text-muted-foreground">{issue.summary}</span>
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* Assignee (searchable) */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Controller
              name="assignee"
              control={form.control}
              render={({ field }) => (
                <Popover
                  open={assigneeOpen}
                  onOpenChange={(open) => {
                    setAssigneeOpen(open);
                    if (!open) setAssigneeSearch("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="assignee"
                      type="button"
                      variant="outline"
                      colorScheme="neutral"
                      className={cn(
                        "w-full justify-between h-10 rounded-md border border-(--color-blackAlpha-300) px-3 py-2 font-normal text-foreground",
                        !displayAssignee && "text-muted-foreground",
                      )}
                    >
                      {displayAssignee ? (
                        <span className="flex items-center gap-2">
                          <Avatar className="size-5">
                            <AvatarImage src={displayAssignee.avatarUrls?.["24x24"]} />
                            <AvatarFallback className="text-xs">
                              {displayAssignee.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {displayAssignee.displayName}
                        </span>
                      ) : (
                        "Search assignee..."
                      )}
                      <Icon path={mdiChevronDown} size="default" className="shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                    <div className="flex items-center justify-end border-b px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentUser) {
                            field.onChange(currentUser.accountId);
                            setSelectedAssigneeUser(currentUser);
                            setAssigneeOpen(false);
                          }
                        }}
                        className="text-sm text-primary hover:underline disabled:opacity-50"
                        disabled={!currentUser}
                      >
                        Assigned to me
                      </button>
                    </div>
                    <Command filter={() => 1} className="rounded-lg border-0 shadow-none">
                      <div className="flex items-center border-b px-2">
                        <Input
                          placeholder="Search by name..."
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          className="h-9 border-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                      <CommandList className="max-h-64">
                        <CommandEmpty>
                          {assigneesLoading ? "Searching..." : "No assignees found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {field.value ? (
                            <CommandItem
                              onSelect={() => {
                                field.onChange("");
                                setSelectedAssigneeUser(null);
                                setAssigneeOpen(false);
                              }}
                            >
                              <span className="text-muted-foreground">Unassigned</span>
                            </CommandItem>
                          ) : null}
                          {assignees.map((u) => (
                            <CommandItem
                              key={u.accountId}
                              value={`${u.accountId}-${u.displayName}`}
                              onSelect={() => {
                                field.onChange(u.accountId);
                                setSelectedAssigneeUser(u);
                                setAssigneeOpen(false);
                              }}
                            >
                              <span className="flex items-center gap-2">
                                <Avatar className="size-5">
                                  <AvatarImage src={u.avatarUrls?.["24x24"]} />
                                  <AvatarFallback className="text-xs">
                                    {u.displayName.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {u.displayName}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <Label>Attachment</Label>
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-(--color-blackAlpha-300) bg-muted/20 px-4 py-6 transition-colors",
                "hover:bg-muted/30",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addAttachmentFiles(e.dataTransfer.files);
              }}
            >
              <Icon path={mdiCloudUpload} size="lg" className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Drop files to attach or{" "}
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="font-medium text-foreground underline hover:no-underline"
                >
                  Browse
                </button>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Max 50MB per file. Allowed: images, PDF, Office, text, zip. Executables and scripts are blocked.
            </p>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              className="hidden"
              accept={[
                "image/*",
                ".pdf",
                ".doc", ".docx",
                ".xls", ".xlsx",
                ".ppt", ".pptx",
                ".txt", ".csv", ".md", ".rtf",
                ".zip", ".rar", ".7z",
                ".json", ".xml", ".yaml", ".yml",
              ].join(",")}
              onChange={(e) => {
                addAttachmentFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {attachmentError && (
              <p className="text-sm text-destructive">{attachmentError}</p>
            )}
            {attachmentFiles.length > 0 && (
              <ul className="space-y-2">
                {attachmentFiles.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border border-(--color-blackAlpha-300) bg-muted/20 p-2"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded border border-(--color-blackAlpha-300) bg-background">
                      {item.objectUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- blob preview for attachment
                        <img
                          src={item.objectUrl}
                          alt=""
                          className="size-full rounded object-cover"
                        />
                      ) : (
                        <Icon
                          path={item.file.type.includes("pdf") ? mdiFileDocumentOutline : mdiFileDocumentOutline}
                          size="default"
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(item.addedAt, "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      colorScheme="neutral"
                      className="size-8 shrink-0 p-0"
                      onClick={() => removeAttachment(item.id)}
                      aria-label="Remove attachment"
                    >
                      <Icon path={mdiClose} size="sm" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Controller
              name="dueDate"
              control={form.control}
              render={({ field }) => (
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      colorScheme="neutral"
                      className={cn(
                        "w-full justify-start text-left h-10 rounded-md border border-(--color-blackAlpha-300) px-3 py-2 font-normal text-foreground",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <Icon
                        path={mdiCalendarBlankOutline}
                        size="default"
                        className="text-muted-foreground shrink-0 opacity-60 font-light"
                      />
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(d: Date | undefined) => {
                        field.onChange(d ?? null);
                        setDueDateOpen(false);
                      }}
                      disabled={{ before: startOfDay(new Date()) }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {errorMessage && (
            <Alert variant="danger">
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>Error: {errorMessage}</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const v = form.getValues();
                    createTask.mutate({
                      projectId: selectedProjectId,
                      issueTypeId: v.issueTypeId,
                      summary: v.summary.trim(),
                      description: v.description?.trim() || undefined,
                      priority: v.priority?.trim() || undefined,
                      parentIssueKey: v.parentIssueKey?.trim() || undefined,
                      assignee: v.assignee?.trim() || undefined,
                      dueDate: v.dueDate
                        ? format(v.dueDate, "yyyy-MM-dd")
                        : undefined,
                    });
                  }}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              colorScheme="neutral"
              onClick={onBack}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="primary"
              disabled={createTask.isPending}
            >
              {createTask.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Creating…
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
