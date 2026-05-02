// ── Error boundary ────────────────────────────────────────────────────────
export { ErrorBoundary } from "./components/ErrorBoundary";

// ── shadcn / UI primitives ─────────────────────────────────────────────────
export * from "./components/ui/accordion";
export * from "./components/ui/alert";
export * from "./components/ui/alert-dialog";
export * from "./components/ui/avatar";
export * from "./components/ui/badge";
export * from "./components/ui/breadcrumb";
export * from "./components/ui/button";
export * from "./components/ui/calendar";
export * from "./components/ui/card";
export * from "./components/ui/carousel";
export * from "./components/ui/checkbox";
export * from "./components/ui/command";
export * from "./components/ui/context-menu";
export * from "./components/ui/date-picker";
export * from "./components/ui/dialog";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/icon";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/navigation-menu";
export * from "./components/ui/popover";
export * from "./components/ui/progress";
export * from "./components/ui/radio-group";
export * from "./components/ui/resizable";
export * from "./components/ui/scroll-area";
export * from "./components/ui/select";
export * from "./components/ui/select-react";
export * from "./components/ui/separator";
export * from "./components/ui/sheet";
export * from "./components/ui/skeleton";
export * from "./components/ui/slider";
export * from "./components/ui/sonner";
export * from "./components/ui/spinner";
export * from "./components/ui/switch";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/tooltip";

// ── Common ────────────────────────────────────────────────────────────────
export type { ADFMark, ADFNode } from "./components/common/AdfRenderer";
export { AdfRenderer } from "./components/common/AdfRenderer";
export { EmptyCard, ErrorCard, LoadingCard } from "./components/common/AsyncStateCards";

// ── Task form fields ───────────────────────────────────────────────────────
export {
  getIssueTypeIconPath,
  isSubtaskIssueTypeName,
  validateAttachmentFile as validateFile,
} from "./components/tasks/task-form/create-task-utils";
export { TaskFormActions } from "./components/tasks/task-form/TaskFormActions";
export { TaskFormAssigneeField } from "./components/tasks/task-form/TaskFormAssigneeField";
export {
  type AttachmentItem,
  isImageFile,
  TaskFormAttachmentsField,
  validateAttachmentFile,
} from "./components/tasks/task-form/TaskFormAttachmentsField";
export { TaskFormDescriptionField } from "./components/tasks/task-form/TaskFormDescriptionField";
export { TaskFormDueDateField } from "./components/tasks/task-form/TaskFormDueDateField";
export { TaskFormField } from "./components/tasks/task-form/TaskFormField";
export { TaskFormHeader } from "./components/tasks/task-form/TaskFormHeader";
export { TaskFormIssueTypeField } from "./components/tasks/task-form/TaskFormIssueTypeField";
export { TaskFormParentIssueField } from "./components/tasks/task-form/TaskFormParentIssueField";
export { TaskFormPriorityField } from "./components/tasks/task-form/TaskFormPriorityField";
export { TaskFormSummaryField } from "./components/tasks/task-form/TaskFormSummaryField";

// ── Task elements (platform-agnostic display components) ───────────────────
export { CommentCard } from "./components/tasks/elements/CommentCard";
export {
  MultiSelectFilter,
  type MultiSelectOption,
} from "./components/tasks/elements/MultiSelectFilter";
export { PriorityBadge } from "./components/tasks/elements/PriorityBadge";
export { StatusBadge } from "./components/tasks/elements/StatusBadge";
export { UserAvatar } from "./components/tasks/elements/UserAvatar";

// ── Task views ─────────────────────────────────────────────────────────────
export {
  AddCommentInput,
  type ReplyTarget,
} from "./components/tasks/action-elements/AddCommentInput";
export { DeleteTaskButton } from "./components/tasks/action-elements/DeleteTaskButton";
export { EditTaskButton } from "./components/tasks/action-elements/EditTaskButton";
export { CreateTaskView, type ParseRequirementsMutation } from "./components/tasks/CreateTaskView";
export { EditTaskView } from "./components/tasks/EditTaskView";
export { SubtasksList } from "./components/tasks/SubtasksList";
export { TaskComments } from "./components/tasks/TaskComments";
export { TaskDetails } from "./components/tasks/TaskDetails";
export {
  type EditProviderWrapperProps,
  TaskDetailsContainer,
} from "./components/tasks/TaskDetailsContainer";
export { TaskListFilters } from "./components/tasks/TaskListFilters";
export { TasksList } from "./components/tasks/TasksList";
export {
  WorkBreakdownEditForm,
  type WorkBreakdownEditFormProps,
} from "./components/tasks/WorkBreakdownEditForm";
export {
  type EditFormWrapperProps,
  WorkBreakdownPreviewView,
  type WorkBreakdownPreviewViewProps,
} from "./components/tasks/WorkBreakdownPreviewView";

// ── Task manager layout ────────────────────────────────────────────────────
export { ProjectPickerSection } from "./components/task-manager/ProjectPickerSection";
export { TaskListSection } from "./components/task-manager/TaskListSection";
export { TaskManagerLayout } from "./components/task-manager/TaskManagerLayout";
export { TaskManagerMainView } from "./components/task-manager/TaskManagerMainView";

// ── Projects ───────────────────────────────────────────────────────────────
export { ProjectPicker, type ProjectPickerProps } from "./components/projects/ProjectPicker";

// ── Connection ─────────────────────────────────────────────────────────────
export { ConnectButton } from "./components/connections/ConnectButton";
export { ConnectionScreen } from "./components/connections/ConnectionScreen";
export { ConnectionSite } from "./components/connections/ConnectionSite";
export { ConnectionStatusBar } from "./components/connections/ConnectionStatusBar";

// ── Providers ─────────────────────────────────────────────────────────────
export { GenericTaskManagerProvider } from "./providers/TaskManagerProvider";

// ── Hooks ─────────────────────────────────────────────────────────────────
export { usePlatformAssignees } from "./hooks/usePlatformAssignees";
export {
  usePlatformDeleteAttachment,
  usePlatformOpenAttachment,
} from "./hooks/usePlatformAttachments";
export { usePlatformAddComment, usePlatformComments } from "./hooks/usePlatformComments";
export {
  usePlatformConnectionStatus,
  usePlatformDisconnect,
} from "./hooks/usePlatformConnectionStatus";
export { usePlatformCurrentUser } from "./hooks/usePlatformCurrentUser";
export { usePlatformIssueDetails } from "./hooks/usePlatformIssueDetails";
export {
  usePlatformCreateIssue,
  usePlatformDeleteIssue,
  usePlatformUpdateIssue,
} from "./hooks/usePlatformIssueManagement";
export { usePlatformIssues, usePlatformProjectIssues } from "./hooks/usePlatformIssues";
export { usePlatformIssueTypes } from "./hooks/usePlatformIssueTypes";
export { usePlatformPermissions } from "./hooks/usePlatformPermissions";
export { usePlatformPriorities } from "./hooks/usePlatformPriorities";
export { usePlatformProjects } from "./hooks/usePlatformProjects";
export { usePlatformSelectProject } from "./hooks/usePlatformSelectProject";
export { usePlatformSelectSite } from "./hooks/usePlatformSelectSite";
export { usePlatformSites } from "./hooks/usePlatformSites";
export { usePlatformStatuses } from "./hooks/usePlatformStatuses";
export { usePlatformStatusChange, usePlatformTransitions } from "./hooks/usePlatformTransitions";

// ── Work breakdown hooks ───────────────────────────────────────────────────
export { useClientOriginUrl } from "./hooks/useClientOriginUrl";
export { useDebounce } from "./hooks/useDebounce";
export { useMarketplaceClient } from "./hooks/useMarketplaceClient";
export { useOAuthPopupHandler } from "./hooks/useOAuthPopupHandler";
export { usePageContext } from "./hooks/usePageContext";
export { useParseRequirements } from "./hooks/useParseRequirements";
export { usePatchWorkBreakdown } from "./hooks/usePatchWorkBreakdown";
export { usePublishWorkBreakdown } from "./hooks/usePublishWorkBreakdown";
export { useWorkBreakdownDraft } from "./hooks/useWorkBreakdownDraft";

// ── Helpers ────────────────────────────────────────────────────────────────
export { extractUniqueStatuses } from "./helpers/extractUniqueStatuses";
export { formatCommentDate } from "./helpers/formatCommentDate";
