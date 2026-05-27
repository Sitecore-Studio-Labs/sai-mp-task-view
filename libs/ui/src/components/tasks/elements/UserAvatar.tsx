"use client";

import { mdiAccountOutline } from "@mdi/js";
import type { AssigneeOption, PlatformUser } from "@mp/task-core";

import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Icon } from "../../ui/icon";

export function UserAvatar({
  user,
  extended = false,
  size = "md",
}: {
  user?: PlatformUser | AssigneeOption;
  extended?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const isUnassigned =
    !user ||
    ("id" in user && user.id === "unassigned") ||
    ("accountId" in user && user.accountId === "unassigned") ||
    !user.displayName?.trim();
  const displayName = isUnassigned ? "Unassigned" : (user.displayName?.trim() ?? "Unknown");
  const avatarSrc = user
    ? "id" in user
      ? user.avatarUrl
      : Object.values(user.avatarUrls ?? {})[0]
    : undefined;
  const initials = displayName.slice(0, 2).toUpperCase();
  const iconSize = size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-6";

  return (
    <div className="flex items-center gap-2">
      <Avatar className={`${size === "sm" ? "size-6" : size === "md" ? "size-8" : "size-10"}`}>
        <AvatarImage src={avatarSrc} alt={displayName} title={displayName} />
        <AvatarFallback className="text-xs font-semibold">
          {isUnassigned ? (
            <Icon
              path={mdiAccountOutline}
              className={iconSize}
              title="Unassigned"
              colorScheme="neutral"
            />
          ) : (
            initials
          )}
        </AvatarFallback>
      </Avatar>
      {extended && <span className="text-sm text-gray-700">{displayName}</span>}
    </div>
  );
}
