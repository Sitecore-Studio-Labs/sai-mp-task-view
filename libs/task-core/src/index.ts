// Contexts
export {
  type CreateTaskMutation,
  CreateTaskProvider,
  type ICreateTaskProvider,
  useCreateTask,
} from "./contexts/CreateTaskContext";
export {
  EditTaskProvider,
  type IEditTaskProvider,
  type UpdateTaskMutation,
  type UpdateTaskPayload,
  useEditTask,
} from "./contexts/EditTaskContext";
export { PlatformApiProvider, usePlatformApiPaths } from "./contexts/PlatformApiContext";
export {
  PlatformCapabilitiesProvider,
  usePlatformCapabilities,
} from "./contexts/PlatformCapabilitiesContext";
export {
  TaskManagerContext,
  type TaskManagerContextValue,
  useTaskManager,
} from "./contexts/TaskManagerContext";

// Types
export type { AsyncStateStatus } from "./types/async-state";
export type {
  AssigneeOption,
  CreateTaskFormValues,
  CreateTaskPayload,
  CreateTaskResult,
  IssueTypeOption,
  ParentIssueOption,
  PriorityOption,
} from "./types/create-task";
export type {
  PlatformPriority,
  PlatformStatus,
  PlatformStatusCategory,
  PlatformUser,
} from "./types/display-types";
export type { PageContextData, PagesContextPageInfo } from "./types/page-context";
export type { PlatformToken } from "./types/platform";
export type {
  AddCommentPayload,
  PlatformAttachment,
  PlatformComment,
  PlatformCommentsResponse,
  PlatformPermissionResponse,
  PlatformProject,
  PlatformProjectStatuses,
  PlatformSite,
  PlatformSitesResponse,
  PlatformTask,
  PlatformTasksPageResponse,
  PlatformTransition,
  TaskFilters,
  TaskManagerView,
} from "./types/platform";
export type { PlatformApiContextValue, PlatformApiPaths } from "./types/platform-api";
export type { PlatformCapabilities } from "./types/platform-capabilities";
export type { PlatformServiceAdapter } from "./types/platform-service-adapter";
export type {
  PlatformExternalResource,
  PlatformSetupMapping,
  PlatformSetupRecord,
  PlatformSetupResponse,
  UpsertPlatformSetupMappingItem,
  UpsertPlatformSetupMappingsPayload,
  UpsertPlatformSetupPayload,
} from "./types/platform-setup";
export type {
  PlatformScopeSelection,
  PlatformSetupScopeConfig,
  SetupScopeLevel,
  SetupScopeListSource,
} from "./types/setup-scope";

// Utils
export { adfToPlainText } from "./utils/adfToPlainText";
export {
  buildPlatformStatusCategory,
  type CanonicalStatusCategoryKey,
  normalizeStatusCategoryKey,
} from "./utils/normalizeStatusCategory";
export {
  buildScopeSelectionsFromJiraLegacy,
  buildUpsertPlatformSetupPayload,
  clearDescendantScopeSelections,
  getActiveScopeHeading,
  getScopeSelection,
  getTaskListScopeKey,
  getTaskListScopeLevel,
  getTenantScopeId,
  getTenantScopeLevels,
  isSetupScopeComplete,
  jiraLegacyFieldsFromScopeSelections,
  mappingRequiresTenantSite,
  scopeSelectionsFromSetupRecord,
} from "./utils/setupScope";

// Schemas
export type { TaskFormSchemaValues } from "./schemas/task-form-schema";
export { SUBTASK_PARENT_REQUIRED_MESSAGE, taskFormSchema } from "./schemas/task-form-schema";

// Constants
export {
  getPlatformSetupScope,
  JIRA_SETUP_SCOPE,
  MONDAY_SETUP_SCOPE,
  PLATFORM_SETUP_SCOPES,
  WRIKE_SETUP_SCOPE,
} from "./constants/platformSetupScopes";
export type { System } from "./constants/systems";
export { SYSTEMS } from "./constants/systems";

// Errors
export { PlatformApiError } from "./types/errors";

// Platform base
export { BasePlatformAdapter } from "./platforms/base/BasePlatformAdapter";
