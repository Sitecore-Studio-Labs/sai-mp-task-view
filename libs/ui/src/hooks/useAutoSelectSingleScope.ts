"use client";

import { useEffect } from "react";

/**
 * Auto-selects a scope item when exactly one is available and none is currently selected.
 * Works for any scope level: sites, projects, folders, boards, workspaces, etc.
 *
 * @param items - Array of scope items (e.g., sites, projects, folders)
 * @param selectedId - Currently selected item ID (or null)
 * @param onSelect - Callback to handle selection
 * @param enabled - Whether to enable auto-selection (default: true)
 *
 * @example
 * useAutoSelectSingleScope(
 *   sites,
 *   selectedSiteId,
 *   (siteId) => setSelectedSiteId(siteId),
 *   true
 * );
 */
export function useAutoSelectSingleScope<T extends { id: string }>(
  items: T[],
  selectedId: string | null,
  onSelect: (id: string) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || items.length !== 1) return;

    const singleItemId = items[0]!.id;
    if (selectedId !== singleItemId) {
      onSelect(singleItemId);
    }
  }, [items, selectedId, onSelect, enabled]);
}
