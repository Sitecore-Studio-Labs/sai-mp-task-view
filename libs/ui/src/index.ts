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
export { PriorityBadge } from "./components/tasks/elements/PriorityBadge";
export { StatusBadge } from "./components/tasks/elements/StatusBadge";
export { UserAvatar } from "./components/tasks/elements/UserAvatar";

// ── Connection ─────────────────────────────────────────────────────────────
export { ConnectionScreen } from "./components/connections/ConnectionScreen";
