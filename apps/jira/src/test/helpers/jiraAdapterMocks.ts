import type { Mock } from "vitest";

export type JiraAdapterMocks = {
  getProjects: Mock;
  getTasks: Mock;
  createTask: Mock;
  getComments: Mock;
  createComment: Mock;
  getTransitions: Mock;
  changeStatus: Mock;
};
