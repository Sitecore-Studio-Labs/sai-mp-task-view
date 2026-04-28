/**
 * Stub AI response: full project-style work breakdown from business requirement.
 * Covers: project setup & tech stack, data/API design, backend APIs, UI builds,
 * integrations, and documentation/deployment so that when done, the app delivers the requirement.
 * Each call varies task order and optional wording so the same description can yield different breakdowns.
 *
 * Replace with real AI call (see prompts/work-breakdown.ts) when ready.
 */

type Node = {
  type: "story" | "task" | "subtask";
  title: string;
  description: string;
  metadata?: { acceptanceCriteria?: string[] };
  children: Node[];
};

const DEFAULT_TECH =
  "React/Next.js frontend, Node.js or Next.js API, and a database (e.g. Postgres/Supabase).";

/** Shuffle array in place using Fisher–Yates. Different each time so same input can produce different output. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One story with full project breakdown: setup → APIs → UI → integration → deploy */
function buildFullProjectBreakdown(storyTitle: string, storySummary: string): Node[] {
  const tasks: Node[] = [
    {
      type: "task",
      title: "Project setup and tech stack",
      description: `**Scope**\nInitialize the project and configure the chosen tech stack so the team can build features.\n\n**Acceptance criteria**\n- Repository created and branch strategy defined.\n- Dependencies installed and dev tooling runs (lint, test, build).\n- Environment and config (env vars, feature flags) documented.`,
      metadata: {
        acceptanceCriteria: [
          "Repository created and branch strategy defined.",
          "Dependencies installed and dev tooling runs (lint, test, build).",
          "Environment and config (env vars, feature flags) documented.",
        ],
      },
      children: [
        {
          type: "subtask",
          title: "Initialize repo and install dependencies",
          description:
            "Create project, add core dependencies, and verify scripts (dev, build, test).",
          children: [],
        },
        {
          type: "subtask",
          title: "Configure lint, format, and tests",
          description: "Set up ESLint, Prettier, and test runner with a passing smoke test.",
          children: [],
        },
        {
          type: "subtask",
          title: "Document environment and runbook",
          description: "Document required env vars and how to run the app locally.",
          children: [],
        },
      ],
    },
    {
      type: "task",
      title: "Data model and API design",
      description: `**Scope**\nDefine the data model and API contracts needed to support the feature.\n\n**Acceptance criteria**\n- Entities and relationships documented.\n- API endpoints and payloads specified.\n- Shared types or OpenAPI/schema available.`,
      metadata: {
        acceptanceCriteria: [
          "Entities and relationships documented.",
          "API endpoints and payloads specified.",
          "Shared types or OpenAPI/schema available.",
        ],
      },
      children: [
        {
          type: "subtask",
          title: "Define data model and schema",
          description:
            "Document entities, fields, and relationships; add DB migrations or schema if applicable.",
          children: [],
        },
        {
          type: "subtask",
          title: "Design API endpoints and payloads",
          description:
            "List REST or GraphQL endpoints, request/response shapes, and error handling.",
          children: [],
        },
        {
          type: "subtask",
          title: "Add shared types or API client stubs",
          description: "Create shared types and optional API client or OpenAPI spec.",
          children: [],
        },
      ],
    },
    {
      type: "task",
      title: "Backend APIs and business logic",
      description: `**Scope**\nImplement backend endpoints and business logic that serve the feature.\n\n**Acceptance criteria**\n- Endpoints implemented and covered by tests.\n- Validation and error handling in place.\n- Integration with data layer working.`,
      metadata: {
        acceptanceCriteria: [
          "Endpoints implemented and covered by tests.",
          "Validation and error handling in place.",
          "Integration with data layer working.",
        ],
      },
      children: [
        {
          type: "subtask",
          title: "Implement API routes and handlers",
          description: "Implement each endpoint with validation and error responses.",
          children: [],
        },
        {
          type: "subtask",
          title: "Add business logic and data access",
          description: "Implement use cases and data access (DB or services).",
          children: [],
        },
        {
          type: "subtask",
          title: "Write API and unit tests",
          description: "Add tests for handlers and business logic.",
          children: [],
        },
      ],
    },
    {
      type: "task",
      title: "UI: Core screens and flows",
      description: `**Scope**\nBuild the main screens and user flows that fulfill the business requirement.\n\n**Acceptance criteria**\n- Key screens implemented and wired to data.\n- Navigation and forms work end-to-end.\n- Loading and error states handled.`,
      metadata: {
        acceptanceCriteria: [
          "Key screens implemented and wired to data.",
          "Navigation and forms work end-to-end.",
          "Loading and error states handled.",
        ],
      },
      children: [
        {
          type: "subtask",
          title: "Implement page layout and navigation",
          description: "Add routes, layout, and navigation for the main flows.",
          children: [],
        },
        {
          type: "subtask",
          title: "Build main views and components",
          description: "Implement primary screens and reusable components.",
          children: [],
        },
        {
          type: "subtask",
          title: "Wire UI to APIs and state",
          description: "Connect components to API calls and state (e.g. React Query, form state).",
          children: [],
        },
        {
          type: "subtask",
          title: "Add loading and error handling in UI",
          description: "Show loading and error states and basic a11y.",
          children: [],
        },
      ],
    },
    {
      type: "task",
      title: "Integration and quality",
      description: `**Scope**\nIntegrate frontend and backend, add E2E coverage, and fix issues.\n\n**Acceptance criteria**\n- Full flow works from UI to backend.\n- Critical paths covered by E2E tests.\n- Known issues documented or fixed.`,
      metadata: {
        acceptanceCriteria: [
          "Full flow works from UI to backend.",
          "Critical paths covered by E2E tests.",
          "Known issues documented or fixed.",
        ],
      },
      children: [
        {
          type: "subtask",
          title: "End-to-end integration and smoke test",
          description: "Run through main user flows and fix integration bugs.",
          children: [],
        },
        {
          type: "subtask",
          title: "Add E2E tests for critical paths",
          description: "Add E2E tests for main happy paths.",
          children: [],
        },
        {
          type: "subtask",
          title: "Accessibility and responsiveness check",
          description: "Verify a11y and responsive behavior on key screens.",
          children: [],
        },
      ],
    },
    {
      type: "task",
      title: "Documentation and deployment",
      description: `**Scope**\nDocument the feature and ensure it can be deployed and operated.\n\n**Acceptance criteria**\n- README or docs updated.\n- Deploy pipeline runs and app is deployable.\n- Runbook or ops notes added as needed.`,
      metadata: {
        acceptanceCriteria: [
          "README or docs updated.",
          "Deploy pipeline runs and app is deployable.",
          "Runbook or ops notes added as needed.",
        ],
      },
      children: [
        {
          type: "subtask",
          title: "Update README and feature docs",
          description: "Document how to run, test, and use the feature.",
          children: [],
        },
        {
          type: "subtask",
          title: "Verify build and deploy pipeline",
          description: "Ensure CI/CD builds and deploys the app successfully.",
          children: [],
        },
      ],
    },
  ];

  // Vary output: shuffle task order so regenerating with same description gives a different breakdown.
  const orderedTasks = shuffle(tasks);

  const story: Node = {
    type: "story",
    title: storyTitle,
    description: storySummary,
    children: orderedTasks,
  };
  return [story];
}

/** Derive a short story title from the requirement (max ~60 chars). */
function storyTitleFromRequirement(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned;
  const first = cleaned.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? cleaned.slice(0, 60);
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

/** Infer tech stack from requirement text if possible; otherwise default. */
function inferTechStack(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("react") || lower.includes("next"))
    return "Next.js/React frontend with API routes or a separate Node backend, and a database.";
  if (lower.includes("mobile") || lower.includes("react native"))
    return "React Native (or Flutter) for mobile, plus backend API and database.";
  return DEFAULT_TECH;
}

function nodeToRaw(item: Node): unknown {
  return {
    type: item.type,
    title: item.title,
    description: item.description,
    metadata: item.metadata,
    children: item.children.map(nodeToRaw),
  };
}

export function stubParseRequirements(requirementText: string): { items: unknown[] } {
  const trimmed = requirementText.trim() || "Deliver the requested feature or product.";
  const storyTitle = storyTitleFromRequirement(trimmed);
  const techStack = inferTechStack(trimmed);
  const storySummary = [
    "**Summary**",
    trimmed.length > 400 ? trimmed.slice(0, 400) + "…" : trimmed,
    "",
    "**Tech stack**",
    techStack,
    "",
    "This breakdown covers project setup, data/API design, backend, UI, integration, and deployment so that when all tasks are done, the app delivers the requirement.",
  ].join("\n\n");

  const items = buildFullProjectBreakdown(storyTitle, storySummary);
  return { items: items.map(nodeToRaw) };
}
