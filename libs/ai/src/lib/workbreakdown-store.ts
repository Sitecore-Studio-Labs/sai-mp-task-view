import type { WorkBreakdown, WorkItem } from "../types/workbreakdown";

/**
 * In-memory store for work breakdown drafts.
 * Uses globalThis so the same Map is shared across API route invocations
 * (avoids "Draft not found" when GET runs in a different serverless instance than POST).
 * Replace with DB (e.g. Supabase) when persisting across restarts.
 */
const globalForStore = globalThis as unknown as {
  __workbreakdownStore?: Map<string, WorkBreakdown>;
};
const store = globalForStore.__workbreakdownStore ?? new Map<string, WorkBreakdown>();
if (!globalForStore.__workbreakdownStore) {
  globalForStore.__workbreakdownStore = store;
}

export function getDraft(draftId: string): WorkBreakdown | null {
  return store.get(draftId) ?? null;
}

export function setDraft(draft: WorkBreakdown): void {
  store.set(draft.id, { ...draft, updatedAt: new Date().toISOString() });
}

export function deleteDraft(draftId: string): boolean {
  return store.delete(draftId);
}

export function generateDraftId(): string {
  return `wb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function nextItemId(): string {
  return `wb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function cloneItem(item: WorkItem): WorkItem {
  return {
    ...item,
    children: item.children.map(cloneItem),
  };
}

function findInTree(items: WorkItem[], itemId: string): WorkItem | null {
  for (const it of items) {
    if (it.id === itemId) return it;
    const found = findInTree(it.children, itemId);
    if (found) return found;
  }
  return null;
}

function findParentAndIndex(
  items: WorkItem[],
  itemId: string,
): { parent: WorkItem[]; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === itemId) return { parent: items, index: i };
    const inChild = findParentAndIndex(items[i].children, itemId);
    if (inChild) return inChild;
  }
  return null;
}

/** Update a node by id (partial). Returns updated draft or null if not found. */
export function updateNodeInDraft(
  draftId: string,
  itemId: string,
  payload: Partial<Pick<WorkItem, "title" | "description" | "type" | "metadata" | "externalKey">>,
): WorkBreakdown | null {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const items = draft.items.map(cloneItem);
  const node = findInTree(items, itemId);
  if (!node) return null;
  if (payload.title !== undefined) node.title = payload.title;
  if (payload.description !== undefined) node.description = payload.description;
  if (payload.type !== undefined) node.type = payload.type;
  if (payload.metadata !== undefined) node.metadata = { ...node.metadata, ...payload.metadata };
  if (payload.externalKey !== undefined) node.externalKey = payload.externalKey;
  const updated: WorkBreakdown = {
    ...draft,
    items,
    updatedAt: new Date().toISOString(),
  };
  setDraft(updated);
  return updated;
}

/** Delete a node by id. Returns updated draft or null if not found. */
export function deleteNodeInDraft(draftId: string, itemId: string): WorkBreakdown | null {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const items = draft.items.map(cloneItem);
  const loc = findParentAndIndex(items, itemId);
  if (!loc) return null;
  loc.parent.splice(loc.index, 1);
  const updated: WorkBreakdown = {
    ...draft,
    items,
    updatedAt: new Date().toISOString(),
  };
  setDraft(updated);
  return updated;
}

/** Add a child to a node (or to root if parentId is null). Returns updated draft. */
export function addChildInDraft(
  draftId: string,
  parentId: string | null,
  item: Omit<WorkItem, "id" | "children"> & { children?: WorkItem[] },
): WorkBreakdown | null {
  const draft = getDraft(draftId);
  if (!draft) return null;
  const items = draft.items.map(cloneItem);
  const newItem: WorkItem = {
    id: nextItemId(),
    type: item.type,
    title: item.title ?? "Untitled",
    description: item.description ?? "",
    children: item.children ?? [],
    metadata: item.metadata,
  };
  if (parentId == null) {
    items.push(newItem);
  } else {
    const parent = findInTree(items, parentId);
    if (!parent) return null;
    parent.children.push(newItem);
  }
  const updated: WorkBreakdown = {
    ...draft,
    items,
    updatedAt: new Date().toISOString(),
  };
  setDraft(updated);
  return updated;
}
