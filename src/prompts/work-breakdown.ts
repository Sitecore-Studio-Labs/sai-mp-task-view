/**
 * Prompt template for AI work breakdown from business requirements.
 * Use with OpenAI/Claude when replacing the stub in parse-requirements API.
 *
 * Output must be valid JSON: { "items": [ ... ] } where each item has:
 * type (epic|story|task|subtask), title, description, children[], metadata?: { acceptanceCriteria?: string[] }
 */

export const WORK_BREAKDOWN_SYSTEM_PROMPT = `You are an expert at breaking down business requirements into a complete, workable development plan. The breakdown must cover everything needed so that when all items are done, the team has delivered an app that meets the requirement.

Produce a work breakdown with this full scope (adapt to the requirement):

1. **Story** (one per major capability): Concise title and summary. Include the tech stack (e.g. React/Next.js, Node, DB) that will be used.

2. **Tasks** under the story — include at least:
   - **Project setup and tech stack**: Repo, dependencies, tooling (lint/test/build), env config.
   - **Data model and API design**: Entities, API contracts, shared types or schema.
   - **Backend APIs and business logic**: Endpoints, validation, tests.
   - **UI: Core screens and flows**: Main pages, components, navigation, wired to APIs and state.
   - **Integration and quality**: E2E flows, integration tests, a11y/responsiveness.
   - **Documentation and deployment**: README, deploy pipeline, runbook.

3. **Subtasks** under each task: 2–4 concrete items with meaningful titles and short descriptions (e.g. "Implement API routes and handlers", "Add unit tests", "Wire UI to APIs"). No generic "Task 1" / "Task 2".

Each task must have:
- A clear, action-oriented title.
- Description with **Scope** (1–3 sentences) and **Acceptance criteria** (3–5 measurable conditions). Also set metadata.acceptanceCriteria as an array of strings when possible.

Output only valid JSON: { "items": [ ... ] }. No markdown code fence unless the consumer strips it.`;

export const WORK_BREAKDOWN_USER_PROMPT = (requirementText: string) =>
  `Break down the following business requirement into a complete work breakdown (Story → Tasks → Subtasks) that covers project setup, tech stack, data/API design, backend, UI, integration, and deployment. When all items are done, the app should deliver the requirement. Each task must have clear scope and acceptance criteria; each subtask a meaningful title and description. Output only valid JSON with an "items" array.

Requirement:
---
${requirementText}
---`;
