"use client";

import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useCreateTask } from "@/contexts/CreateTaskContext";
import type { CreateTaskFormValues } from "@/types/create-task";
import type { AssigneeOption, ParentIssueOption } from "@/types/create-task";
import { taskFormSchema } from "@/schemas/task-form-schema";
import {
  TaskFormHeader,
  TaskFormIssueTypeField,
  TaskFormSummaryField,
  TaskFormDescriptionField,
  TaskFormPriorityField,
  TaskFormParentIssueField,
  TaskFormAssigneeField,
  TaskFormAttachmentsField,
  TaskFormDueDateField,
  TaskFormActions,
  type AttachmentItem,
  validateAttachmentFile,
  isImageFile,
} from "./task-form";

type CreateTaskViewProps = {
  onBack: () => void;
  onSuccess?: () => void;
};

/**
 * Platform-agnostic create-task form. Must be rendered inside a CreateTaskProvider
 * (e.g. JiraCreateTaskProvider). All data and actions come from context.
 */
export function CreateTaskView({ onBack, onSuccess }: CreateTaskViewProps) {
  const provider = useCreateTask();
  const {
    projectId,
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
    createTask,
    uploadAttachments,
    defaultFormValues,
  } = provider;

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaultFormValues,
    mode: "onChange",
  });

  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [parentIssueOpen, setParentIssueOpen] = useState(false);
  const [selectedAssigneeUser, setSelectedAssigneeUser] = useState<AssigneeOption | null>(null);
  const [selectedParentIssue, setSelectedParentIssue] = useState<ParentIssueOption | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentItem[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const assigneeValue = useWatch({ control: form.control, name: "assignee", defaultValue: "" });
  const parentIssueKeyValue = useWatch({ control: form.control, name: "parentIssueKey", defaultValue: "" });
  const issueTypeIdValue = useWatch({ control: form.control, name: "issueTypeId", defaultValue: "" });
  const selectedIssueTypeName = issueTypes.find((it) => it.id === issueTypeIdValue)?.name ?? "";
  const allowedParentTypeNames = getAllowedParentTypeNames(selectedIssueTypeName);
  const filteredParentIssues =
    allowedParentTypeNames.size === 0
      ? []
      : parentIssues.filter(
          (i) => i.issueType?.name && allowedParentTypeNames.has(i.issueType!.name),
        );

  const displayAssignee: AssigneeOption | null =
    assigneeValue === ""
      ? null
      : selectedAssigneeUser ?? assignees.find((u) => u.id === assigneeValue) ?? null;
  const displayParentIssue: ParentIssueOption | null =
    parentIssueKeyValue === ""
      ? null
      : selectedParentIssue ?? parentIssues.find((i) => i.key === parentIssueKeyValue) ?? null;

  useEffect(() => {
    if (!issueTypeIdValue || !parentIssueKeyValue || !displayParentIssue?.issueType?.name) return;
    const allowed = getAllowedParentTypeNames(selectedIssueTypeName);
    if (!allowed.has(displayParentIssue.issueType.name)) {
      form.setValue("parentIssueKey", "");
      queueMicrotask(() => setSelectedParentIssue(null));
    }
  }, [issueTypeIdValue, selectedIssueTypeName, parentIssueKeyValue, displayParentIssue?.issueType?.name, form, getAllowedParentTypeNames]);

  const prevProjectIdRef = useRef(projectId);
  useEffect(() => {
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      form.setValue("parentIssueKey", "");
      queueMicrotask(() => setSelectedParentIssue(null));
    }
  }, [projectId, form]);

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

  const buildPayload = useCallback(
    (values: CreateTaskFormValues) => ({
      projectId,
      issueTypeId: values.issueTypeId,
      summary: values.summary.trim(),
      description: values.description?.trim() || undefined,
      priority: values.priority?.trim() || undefined,
      parentIssueKey: values.parentIssueKey?.trim() || undefined,
      assignee: values.assignee?.trim() || undefined,
      dueDate: values.dueDate
        ? format(values.dueDate, "yyyy-MM-dd")
        : undefined,
    }),
    [projectId],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = buildPayload(values);
    try {
      const task = await createTask.mutateAsync(payload);
      const formFiles = attachmentFiles.map((a) => a.file);
      form.reset(defaultFormValues);
      setSelectedParentIssue(null);
      attachmentFiles.forEach((a) => {
        if (a.objectUrl) URL.revokeObjectURL(a.objectUrl);
      });
      setAttachmentFiles([]);
      setAttachmentError(null);
      createTask.reset();
      onSuccess?.();
      if (formFiles.length > 0) {
        uploadAttachments(task.key, formFiles);
      }
    } catch {
      // Error shown via createTask.isError
    }
  });

  const handleRetry = useCallback(() => {
    const v = form.getValues();
    void createTask.mutateAsync(buildPayload(v));
  }, [form, createTask, buildPayload]);

  return (
    <div className="wrapper space-y-4">
      <TaskFormHeader formTitle={formTitle} onBack={onBack} />

      <Card elevation="none" style="outline" padding="md">
        <FormProvider {...form}>
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4"
            aria-label="Create task"
          >
            <TaskFormIssueTypeField
              issueTypes={issueTypes}
              issueTypesLoading={issueTypesLoading}
            />
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
            <TaskFormDueDateField
              open={dueDateOpen}
              onOpenChange={setDueDateOpen}
            />
            <TaskFormActions
              createTask={createTask}
              onBack={onBack}
              onRetry={handleRetry}
              submitLabel="Create Task"
              submittingLabel="Creating…"
            />
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
