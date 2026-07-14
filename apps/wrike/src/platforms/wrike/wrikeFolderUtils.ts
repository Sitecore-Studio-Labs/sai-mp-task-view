import { WrikeClientError } from "@/exceptions/wrikeErrors";

/** Wrike virtual folders (account root, recycle bin, etc.) — not valid for GET /folders/{id}. */
export function isWrikeLogicalFolderId(folderId: string): boolean {
  return folderId.endsWith("7777777");
}

export function isWrikeLogicalFolderError(error: unknown): boolean {
  if (error instanceof WrikeClientError) {
    return error.statusCode === 400 && error.message.toLowerCase().includes("logical folder");
  }

  const err = error as {
    response?: { status?: number; data?: { errorDescription?: string } };
  };
  const description = err.response?.data?.errorDescription;
  return (
    err.response?.status === 400 &&
    typeof description === "string" &&
    description.toLowerCase().includes("logical folder")
  );
}

/** parentIds on subtasks may reference tasks or logical folders — keep only real folder ids. */
export function filterPhysicalFolderIds(parentIds: string[] | undefined): string[] {
  return (parentIds ?? []).filter((id) => !isWrikeLogicalFolderId(id));
}
