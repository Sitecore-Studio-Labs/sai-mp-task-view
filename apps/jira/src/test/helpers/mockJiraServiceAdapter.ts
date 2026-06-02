import { vi } from "vitest";

export const jiraAdapterMocks = {
  getProjects: vi.fn(),
  getTasks: vi.fn(),
  createTask: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  getTransitions: vi.fn(),
  changeStatus: vi.fn(),
};

vi.mock("@/platforms/JiraServiceAdapter", () => ({
  JiraServiceAdapter: vi.fn(function MockJiraServiceAdapter() {
    return jiraAdapterMocks;
  }),
}));
