---
name: Provider Platform Generalization
overview: "Fully generalize the CreateTaskProvider and EditTaskProvider by closing the four remaining gaps: existing attachments, parent issue search, attachment upload, and parent type rules."
todos:
  - id: existing-attachments
    content: Read task.attachments in EditTaskProvider instead of returning empty array
    status: completed
  - id: parent-search-backend
    content: Add query filter to PlatformTaskFilters, JQL builder, WrikeAdapter, and /api/platform/tasks route
    status: completed
  - id: parent-search-hook
    content: Create useParentTasks hook and wire it into both providers with debounced search
    status: completed
  - id: parent-type-rules
    content: Extract parent type rules into shared utility with platform-conditional logic, wire into providers
    status: completed
  - id: attachment-upload-backend
    content: Add uploadAttachment to PlatformAdapter, implement in JiraAdapter and WrikeAdapter, create /api/platform/attachments route
    status: completed
  - id: attachment-upload-frontend
    content: Update both providers to call /api/platform/attachments instead of /jira/attachment/upload
    status: completed
  - id: cleanup
    content: Delete JiraCreateTaskProvider, JiraEditTaskProvider, and any now-unused Jira-only hooks
    status: completed
isProject: false
---

# Generalize Create/Edit Task Providers

## Current State

The platform-neutral providers ([CreateTaskProvider.tsx](src/providers/create-task/CreateTaskProvider.tsx) and [EditTaskProvider.tsx](src/providers/edit-task/EditTaskProvider.tsx)) already use platform hooks for issue types, priorities, assignees, current user, and create/update mutations. But they stub out or hardcode four things that the Jira-specific providers ([JiraCreateTaskProvider.tsx](src/providers/create-task/JiraCreateTaskProvider.tsx) and [JiraEditTaskProvider.tsx](src/providers/edit-task/JiraEditTaskProvider.tsx)) handle fully.

---

## Step 1: Existing attachments in EditTaskProvider (trivial)

`PlatformTask` already has `attachments?: PlatformAttachment[]`. The platform `EditTaskProvider` currently returns `existingAttachments: []`.

- In [EditTaskProvider.tsx](src/providers/edit-task/EditTaskProvider.tsx), change:

```
  existingAttachments: [],


```

to read from the task:

```
  existingAttachments: task.attachments ?? [],


```

No new files, hooks, or routes needed.

---

## Step 2: Parent issue search

The parent issue picker needs a way to search tasks in a project by text. The existing `/api/platform/tasks` endpoint and `PlatformAdapter.getTasks()` already support project-scoped task fetching but have no text query filter.

**Changes needed:**

- **Add `query?: string` to `PlatformTaskFilters`** in [platform-entities.ts](src/types/platform-entities.ts)
- **Add `query` to `JiraIssueFilters`** in [jira.ts](src/types/jira.ts) and add a JQL `summary ~ "..."` clause in [jqlBuilder.ts](src/lib/jqlBuilder.ts)
- **Handle `query` in `WrikeAdapter.getTasks()`** (Wrike supports `title` filter on task search)
- **Pass `query` through the route** in [tasks/route.ts](src/app/api/platform/tasks/route.ts) -- read a `query` search param and include it in the filters
- **Create `useParentTasks` hook** (new file `src/hooks/useParentTasks.ts`) that calls `/api/platform/tasks?projectId=X&query=Y` with debounced search, maps results to `ParentIssueOption[]`, and excludes the current task (for edit)
- **Wire into both providers** -- replace the stubs with the new hook, add debounced `parentIssueSearch` state

---

## Step 3: Parent type rules (platform-conditional)

`getAllowedParentIssueTypeNames` is Jira-specific hierarchy logic (sub-tasks go under Stories/Tasks, Stories go under Epics, etc.). Wrike has no concept of issue type hierarchy.

**Approach:** Add optional `getParentTypeRules(childType: string): Set<string>` to the `PlatformAdapter` interface with a default empty-set. Only the Jira adapter returns meaningful data. The providers call a new platform endpoint to retrieve the rules, or more simply:

- **Simpler approach:** Move the rules function into a shared utility, and have the providers call it conditionally based on `task.platform` (already available on `PlatformTask`). If `platform !== "jira"`, return an empty set (meaning all types are valid parents). This avoids a new API round-trip for static logic.

**Files:**

- Create `src/helpers/parentTypeRules.ts` with the existing `getAllowedParentIssueTypeNames` function plus a `getParentTypeRulesForPlatform(platform, childType)` wrapper
- Update both platform providers to import and use the wrapper

---

## Step 4: Platform-neutral attachment upload

Both providers hardcode `/jira/attachment/upload`. We need a platform-neutral upload route.

**Backend changes:**

- **Add `uploadAttachment` to `PlatformAdapter`** in [PlatformAdapter.ts](src/platforms/base/PlatformAdapter.ts):

```typescript
  uploadAttachment(
    token: PlatformToken,
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<PlatformAttachment>;


```

- **JiraAdapter**: Already has `addAttachment()` -- rename/wrap it to implement the interface method
- **WrikeAdapter**: Implement using Wrike's `PUT /tasks/{taskId}/attachments` API
- **Add `uploadAttachmentForUser` to `platformService.ts`**
- **Create `/api/platform/attachments/route.ts`** (POST) -- accepts multipart form data with `taskId` query param, delegates to `uploadAttachmentForUser`

**Frontend changes:**

- Update the `uploadAttachmentsBackground` / `uploadAttachmentsBg` functions in both providers to call `/platform/attachments?taskId=...` instead of `/jira/attachment/upload?issueIdOrKey=...`

---

## After completion

Once all four steps are done, the Jira-specific providers (`JiraCreateTaskProvider.tsx` and `JiraEditTaskProvider.tsx`) become dead code and can be deleted, along with any Jira-only hooks they exclusively import (`useJiraProjectIssues`, `useCreateJiraTask`, `useUpdateJiraTask`, `useJiraIssueTypes`, `useJiraPriorities`, `useJiraAssignees`, `useJiraCurrentUser`).
