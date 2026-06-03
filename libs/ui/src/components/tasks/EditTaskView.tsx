"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { mdiFilePdfBox, mdiTrashCanOutline } from "@mdi/js";
import type {
  AssigneeOption,
  CreateTaskFormValues,
  ParentIssueOption,
  UpdateTaskPayload,
} from "@mp/task-core";
import {
  SUBTASK_PARENT_REQUIRED_MESSAGE,
  taskFormSchema,
  useEditTask,
  usePlatformApiPaths,
  usePlatformCapabilities,
} from "@mp/task-core";
import { TaskFormActions } from "@mp/ui/components/tasks/task-form/TaskFormActions";
import { TaskFormAssigneeField } from "@mp/ui/components/tasks/task-form/TaskFormAssigneeField";
import {
  AttachmentItem,
  isImageFile,
  TaskFormAttachmentsField,
  validateAttachmentFile,
} from "@mp/ui/components/tasks/task-form/TaskFormAttachmentsField";
import { TaskFormDescriptionField } from "@mp/ui/components/tasks/task-form/TaskFormDescriptionField";
import { TaskFormDueDateField } from "@mp/ui/components/tasks/task-form/TaskFormDueDateField";
import { TaskFormHeader } from "@mp/ui/components/tasks/task-form/TaskFormHeader";
import { TaskFormIssueTypeField } from "@mp/ui/components/tasks/task-form/TaskFormIssueTypeField";
import { TaskFormParentIssueField } from "@mp/ui/components/tasks/task-form/TaskFormParentIssueField";
import { TaskFormPriorityField } from "@mp/ui/components/tasks/task-form/TaskFormPriorityField";
import { TaskFormSummaryField } from "@mp/ui/components/tasks/task-form/TaskFormSummaryField";
import { format } from "date-fns";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { usePlatformDeleteAttachment } from "../../hooks/usePlatformAttachments";
import { useTracking } from "../../hooks/useTracking";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";
import { isSubtaskIssueTypeName } from "./task-form/create-task-utils";

type EditTaskViewProps = {
  onBack: () => void;
  onSuccess?: () => void;
};

export function EditTaskView({ onBack, onSuccess }: EditTaskViewProps) {
  const provider = useEditTask();
  const {
    taskKey,
    formTitle,
    issueTypes,
    issueTypesLoading,
    priorities,
    assignees,
    assigneesLoading,
    assigneeSearch,
    setAssigneeSearch,
    currentUser,
    parentIssues,
    parentIssuesLoading,
    parentIssueSearch,
    setParentIssueSearch,
    getAllowedParentTypeNames,
    updateTask,
    uploadAttachments,
    existingAttachments,
    initialAssignee,
    defaultFormValues,
  } = provider;

  const { hasAttachments, platformName } = usePlatformCapabilities();
  const { business } = useTracking();
  const { client, paths } = usePlatformApiPaths();
  const deleteAttachment = usePlatformDeleteAttachment();

  const attachmentUrl = (id: string): string => {
    if (!paths.attachment) return "";
    const base = (client.defaults.baseURL ?? "").replace(/\/$/, "");
    return `${base}${paths.attachment(id)}`;
  };

  const [existing, setExisting] = useState(existingAttachments);
  const [initialDefaults] = useState(() => defaultFormValues);

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaultFormValues,
    mode: "onChange",
  });

  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [parentIssueOpen, setParentIssueOpen] = useState(false);
  const [selectedAssigneeUser, setSelectedAssigneeUser] = useState<AssigneeOption | null>(
    initialAssignee,
  );
  const [selectedParentIssue, setSelectedParentIssue] = useState<ParentIssueOption | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentItem[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  useEffect(() => {
    if (!initialAssignee?.id) return;
    const current = form.getValues("assignee");
    if (!current) {
      form.setValue("assignee", initialAssignee.id, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [form, initialAssignee?.id]);

  const assigneeValue = useWatch({ control: form.control, name: "assignee" });
  const parentIssueKeyValue = useWatch({ control: form.control, name: "parentIssueKey" });
  const issueTypeIdValue = useWatch({ control: form.control, name: "issueTypeId" });

  const selectedIssueTypeName = issueTypes.find((it) => it.id === issueTypeIdValue)?.name ?? "";
  const allowedParentTypeNames = getAllowedParentTypeNames(selectedIssueTypeName);
  const filteredParentIssues = useMemo(() => {
    if (allowedParentTypeNames.size === 0) return [];
    const allowedLower = new Set(Array.from(allowedParentTypeNames).map((n) => n.toLowerCase()));
    return parentIssues.filter(
      (i) => i.issueType?.name && allowedLower.has(i.issueType.name.toLowerCase()),
    );
  }, [parentIssues, allowedParentTypeNames]);

  const displayAssignee: AssigneeOption | null =
    assigneeValue === ""
      ? null
      : (selectedAssigneeUser ?? assignees.find((u) => u.id === assigneeValue) ?? null);
  const displayParentIssue: ParentIssueOption | null =
    parentIssueKeyValue === ""
      ? null
      : (selectedParentIssue ?? parentIssues.find((i) => i.key === parentIssueKeyValue) ?? null);

  useEffect(() => {
    if (!issueTypeIdValue || !parentIssueKeyValue || !displayParentIssue?.issueType?.name) return;
    const allowed = getAllowedParentTypeNames(selectedIssueTypeName);
    const parentTypeLower = displayParentIssue.issueType.name.toLowerCase();
    const isAllowed = Array.from(allowed).some((a) => a.toLowerCase() === parentTypeLower);
    if (!isAllowed) {
      form.setValue("parentIssueKey", "");
      queueMicrotask(() => setSelectedParentIssue(null));
    }
  }, [
    issueTypeIdValue,
    selectedIssueTypeName,
    parentIssueKeyValue,
    displayParentIssue?.issueType?.name,
    form,
    getAllowedParentTypeNames,
  ]);

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

  const buildUpdatePayload = useCallback(
    (values: CreateTaskFormValues) => {
      const initial = initialDefaults;
      const summaryTrimmed = values.summary.trim();
      const descriptionTrimmed = values.description?.trim() ?? "";
      const issueTypeId = values.issueTypeId?.trim() ?? "";
      const parentKey = values.parentIssueKey?.trim() ?? "";
      const priorityId = values.priority?.trim() ?? "";
      const assigneeId = values.assignee?.trim() ?? "";
      const dueDate = values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : "";
      const payload: UpdateTaskPayload = {};
      if (summaryTrimmed !== (initial.summary ?? "").trim()) payload.summary = summaryTrimmed;
      const initialDesc = (initial.description ?? "").trim();
      if (descriptionTrimmed !== initialDesc) {
        payload.description = descriptionTrimmed === "" ? null : descriptionTrimmed;
      }
      const initialIssueTypeId = (initial.issueTypeId ?? "").trim();
      const initialParentKey = (initial.parentIssueKey ?? "").trim();
      const selectedType = issueTypes.find((it) => it.id === issueTypeId);
      const isSubtask = selectedType ? isSubtaskIssueTypeName(selectedType.name) : false;
      if (issueTypeId !== initialIssueTypeId) {
        payload.issueType = issueTypeId === "" ? null : issueTypeId;
        if (isSubtask) payload.parentIssueKey = parentKey || null;
      }
      if (parentKey !== initialParentKey && isSubtask) payload.parentIssueKey = parentKey || null;
      if (priorityId !== (initial.priority ?? "").trim()) {
        payload.priority = priorityId === "" ? null : priorityId;
      }
      if (assigneeId !== (initial.assignee ?? "").trim()) {
        payload.assignee = assigneeId === "" ? null : assigneeId;
      }
      const initialDue = initial.dueDate != null ? format(initial.dueDate, "yyyy-MM-dd") : "";
      if (dueDate !== initialDue) payload.dueDate = dueDate === "" ? null : dueDate;
      return payload;
    },
    [initialDefaults, issueTypes],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const selectedType = issueTypes.find((it) => it.id === values.issueTypeId?.trim());
    const isSubtask = selectedType ? isSubtaskIssueTypeName(selectedType.name) : false;
    if (isSubtask && !(values.parentIssueKey ?? "").trim()) {
      form.setError("parentIssueKey", { type: "manual", message: SUBTASK_PARENT_REQUIRED_MESSAGE });
      return;
    }
    const payload = buildUpdatePayload(values);
    const files = attachmentFiles.map((a) => a.file);
    try {
      if (Object.keys(payload).length > 0) {
        await updateTask.mutateAsync(payload);
        business.featureUsed({ featureKey: "edit-task", platform: platformName });
      }
      attachmentFiles.forEach((a) => {
        if (a.objectUrl) URL.revokeObjectURL(a.objectUrl);
      });
      setAttachmentFiles([]);
      setAttachmentError(null);
      updateTask.reset();
      if (files.length > 0) await uploadAttachments(taskKey, files);
      onSuccess?.();
    } catch {
      // Error shown via updateTask.isError
    }
  });

  const handleRetry = useCallback(() => {
    void updateTask.mutateAsync(buildUpdatePayload(form.getValues()));
  }, [form, updateTask, buildUpdatePayload]);

  const updateState = useMemo(
    () => ({
      isPending: updateTask.isPending,
      isError: updateTask.isError,
      error: updateTask.error,
      reset: updateTask.reset,
    }),
    [updateTask],
  );

  return (
    <div className="wrapper space-y-4">
      <TaskFormHeader formTitle={formTitle} onBack={onBack} />

      <Card elevation="none" style="outline" padding="md">
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Edit task">
            <TaskFormIssueTypeField issueTypes={issueTypes} issueTypesLoading={issueTypesLoading} />
            <TaskFormSummaryField />
            <TaskFormDescriptionField />
            <TaskFormPriorityField priorities={priorities} />
            <TaskFormParentIssueField
              open={parentIssueOpen}
              onOpenChange={setParentIssueOpen}
              search={parentIssueSearch}
              onSearchChange={setParentIssueSearch}
              parentIssuesLoading={parentIssuesLoading}
              filteredParentIssues={filteredParentIssues}
              displayParentIssue={displayParentIssue}
              selectedIssueTypeName={selectedIssueTypeName}
              allowedParentTypeNames={allowedParentTypeNames}
              onSelectParentIssue={setSelectedParentIssue}
            />
            <TaskFormAssigneeField
              open={assigneeOpen}
              onOpenChange={setAssigneeOpen}
              search={assigneeSearch}
              onSearchChange={setAssigneeSearch}
              assignees={assignees}
              assigneesLoading={assigneesLoading}
              displayAssignee={displayAssignee}
              currentUser={currentUser ?? null}
              onSelectAssignee={setSelectedAssigneeUser}
            />
            <TaskFormAttachmentsField
              attachmentFiles={attachmentFiles}
              attachmentError={attachmentError}
              attachmentInputRef={attachmentInputRef}
              onAddFiles={addAttachmentFiles}
              onRemove={removeAttachment}
            />

            {hasAttachments && existing.length > 0 && (
              <div className="rounded-md border border-(--color-blackAlpha-300) p-3">
                <div className="grid grid-cols-1 gap-2">
                  {existing.map((a) => {
                    const lower = a.filename.toLowerCase();
                    const isPdf = lower.endsWith(".pdf");
                    const isImg = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower);
                    const url = attachmentUrl(a.id);

                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-md border border-(--color-blackAlpha-200) p-2"
                      >
                        {isImg ? (
                          <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                            <Image
                              src={url}
                              alt={a.filename}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded border border-(--color-blackAlpha-200) object-cover"
                              unoptimized
                            />
                          </a>
                        ) : isPdf ? (
                          <span className="shrink-0">
                            <Icon
                              path={mdiFilePdfBox}
                              size="md"
                              colorScheme="danger"
                              variant="subtle"
                            />
                          </span>
                        ) : (
                          <span className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded text-xs">
                            FILE
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary block truncate text-sm font-medium hover:underline"
                            title={a.filename}
                          >
                            {a.filename}
                          </a>
                          {isPdf && <div className="text-muted-foreground text-xs">PDF</div>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          colorScheme="danger"
                          size="sm"
                          className="px-2"
                          disabled={deleteAttachment.isPending}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await deleteAttachment.mutateAsync(a.id);
                              setExisting((prev) => prev.filter((x) => x.id !== a.id));
                            } catch {
                              // error surfaced via mutation state
                            }
                          }}
                          aria-label={`Delete attachment ${a.filename}`}
                        >
                          <Icon path={mdiTrashCanOutline} size="sm" colorScheme="danger" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <TaskFormDueDateField open={dueDateOpen} onOpenChange={setDueDateOpen} />
            <TaskFormActions
              mutation={updateState}
              onBack={onBack}
              onRetry={handleRetry}
              submitLabel="Save changes"
              submittingLabel="Saving…"
              errorFallbackMessage="Failed to save changes, please try again."
            />
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
