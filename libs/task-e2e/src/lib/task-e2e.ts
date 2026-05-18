export interface TaskAppTestingSuite {
  // connect to the platform
  connectPlatform(): void;

  // disconnect from the platform
  disconnectPlatform(): void;

  // task operations
  createTask(): void;
  deleteTask(): void;
  editTask(): void;
  listTasks(): void;
  viewTask(): void;
}
