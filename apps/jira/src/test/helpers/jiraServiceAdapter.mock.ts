import { vi } from "vitest";

import type { JiraAdapterMocks } from "./jiraAdapterMocks";

const adapterMocks = vi.hoisted(() => ({
  getProjects: vi.fn(),
  getTasks: vi.fn(),
  createTask: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  getTransitions: vi.fn(),
  changeStatus: vi.fn(),
}));

vi.mock("@/platforms/JiraServiceAdapter", () => ({
  JiraServiceAdapter: vi.fn(() => adapterMocks),
}));

/** Import this module before route handlers in API route tests. */
export function getJiraAdapterMocks(): JiraAdapterMocks {
  return adapterMocks;
}
