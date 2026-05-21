"use client";

import type { AssigneeOption, PlatformUser } from "@mp/task-core";

import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";

export function UserAvatar({
  user,
  extended = false,
  size = "md",
}: {
  user?: PlatformUser | AssigneeOption;
  extended?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const displayName = user?.displayName || "Unknown";
  const avatarSrc = user
    ? "id" in user
      ? user.avatarUrl
      : Object.values(user.avatarUrls ?? {})[0]
    : undefined;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Avatar className={`${size === "sm" ? "size-6" : size === "md" ? "size-8" : "size-10"}`}>
        <AvatarImage
          src={avatarSrc}
          alt={user?.displayName || "User Avatar"}
          title={user?.displayName || "User Avatar"}
        />
        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      {extended && <span className="text-sm text-gray-700">{displayName}</span>}
    </div>
  );
}
