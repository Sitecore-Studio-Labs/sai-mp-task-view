"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { mdiAutoFix } from "@mdi/js";
import { cn } from "@mp/shared";
import type { AssigneeOption, CreateTaskFormValues, ParentIssueOption } from "@mp/task-core";
import {
  SUBTASK_PARENT_REQUIRED_MESSAGE,
  taskFormSchema,
  useCreateTask,
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
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { useTracking } from "../../hooks/useTracking";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { isSubtaskIssueTypeName } from "./task-form/create-task-utils";

/** Minimal shape of the AI parse-requirements mutation, injected from platform layer. */
export interface ParseRequirementsMutation {
  mutate: (payload: { requirementText: string; projectKey: string }) => void;
  isPending: boolean;
  isError: boolean;
  error?: { message?: string } | null;
}

type CreateTaskViewProps = {
  onBack: () => void;
  onSuccess?: () => void;
  /**
   * Platform-supplied AI parse-requirements mutation.
   * When omitted the AI panel is hidden even if hasAiWorkBreakdown is true.
   * On success (e.g. draft created), handle navigation in the hook that implements this mutation.
   */
  parseRequirementsMutation?: ParseRequirementsMutation;
};

export function CreateTaskView({
  onBack,
  onSuccess,
  parseRequirementsMutation,
}: CreateTaskViewProps) {
  const { hasAiWorkBreakdown, platformName } = usePlatformCapabilities();
  const { business } = useTracking();
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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [requirementText, setRequirementText] = useState("");

  const showAiPanel = hasAiWorkBreakdown && !!parseRequirementsMutation;

  const assigneeValue = useWatch({ control: form.control, name: "assignee", defaultValue: "" });
  const parentIssueKeyValue = useWatch({
    control: form.control,
    name: "parentIssueKey",
    defaultValue: "",
  });
  const issueTypeIdValue = useWatch({
    control: form.control,
    name: "issueTypeId",
    defaultValue: "",
  });

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
      : (selectedAssigneeUser ?? assignees.find((u) => u.id === assigneeValue) ?? null);
  const displayParentIssue: ParentIssueOption | null =
    parentIssueKeyValue === ""
      ? null
      : (selectedParentIssue ?? parentIssues.find((i) => i.key === parentIssueKeyValue) ?? null);

  useEffect(() => {
    if (!issueTypeIdValue || !parentIssueKeyValue || !displayParentIssue?.issueType?.name) return;
    const allowed = getAllowedParentTypeNames(selectedIssueTypeName);
    if (!allowed.has(displayParentIssue.issueType.name)) {
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
      dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : undefined,
    }),
    [projectId],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    if (issueTypes.length > 0 && !values.issueTypeId?.trim()) {
      form.setError("issueTypeId", { type: "manual", message: "Issue type is required" });
      return;
    }
    const selectedType = issueTypes.find((it) => it.id === values.issueTypeId?.trim());
    const isSubtask = selectedType ? isSubtaskIssueTypeName(selectedType.name) : false;
    if (isSubtask && !(values.parentIssueKey ?? "").trim()) {
      form.setError("parentIssueKey", { type: "manual", message: SUBTASK_PARENT_REQUIRED_MESSAGE });
      return;
    }
    const payload = buildPayload(values);
    try {
      const task = await createTask.mutateAsync(payload);
      business.featureUsed({ featureKey: "create-task", platform: platformName });
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
      if (formFiles.length > 0) uploadAttachments(task.key, formFiles);
    } catch {
      // Error shown via createTask.isError
    }
  });

  const handleRetry = useCallback(() => {
    void createTask.mutateAsync(buildPayload(form.getValues()));
  }, [form, createTask, buildPayload]);

  return (
    <div className="wrapper mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <TaskFormHeader formTitle={formTitle} onBack={onBack} />
        {showAiPanel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            colorScheme="neutral"
            className={cn(
              "hover:bg-muted/50 shrink-0",
              aiPanelOpen && "ring-primary/20 bg-primary/5 ring-2",
            )}
            onClick={() => setAiPanelOpen((open) => !open)}
            aria-label="Generate tasks from description"
            aria-expanded={aiPanelOpen}
          >
            <span
              className="animate-gradient-icon inline-block size-6 shrink-0"
              style={{
                WebkitMaskImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="${mdiAutoFix}"/></svg>`)}")`,
                maskImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="${mdiAutoFix}"/></svg>`)}")`,
              }}
            />
            <span className="sr-only">AI: Generate tasks from description</span>
          </Button>
        )}
      </div>

      {showAiPanel && aiPanelOpen && (
        <div className="max-h-[320px] overflow-hidden transition-[max-height] duration-300 ease-in-out">
          <Card elevation="none" variant="outline" padding="md">
            <div className="space-y-2">
              <h3 className="animate-gradient-text text-lg font-semibold">
                Generate your task breakdown with AI
              </h3>
              <Label htmlFor="ai-requirement">Business requirements / description</Label>
              <Textarea
                id="ai-requirement"
                placeholder="Describe the feature or requirements in free text. You can then generate a structured work breakdown (Epics, Stories, Tasks) and publish to the connected platform."
                value={requirementText}
                onChange={(e) => setRequirementText(e.target.value)}
                className="min-h-24 resize-y border-(--color-blackAlpha-300)"
                rows={4}
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  colorScheme="primary"
                  disabled={!requirementText.trim() || parseRequirementsMutation!.isPending}
                  onClick={() =>
                    parseRequirementsMutation!.mutate({
                      requirementText: requirementText.trim(),
                      projectKey: projectId,
                    })
                  }
                >
                  {parseRequirementsMutation!.isPending ? "Generating…" : "Generate work breakdown"}
                </Button>
                {parseRequirementsMutation!.isError && (
                  <span className="text-destructive text-sm">
                    {parseRequirementsMutation!.error?.message}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card elevation="none" variant="outline" padding="md">
        <FormProvider {...form}>
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4"
            aria-label="Create task"
            data-testid="create-task-form"
          >
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
            <TaskFormDueDateField open={dueDateOpen} onOpenChange={setDueDateOpen} />
            <TaskFormActions
              mutation={createTask}
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
