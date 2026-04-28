"use client";

import { mdiAccountOutline } from "@mdi/js";
import type { PlatformUser } from "@mp/task-core";

import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Icon } from "../../ui/icon";

export function UserAvatar({
  user,
  extended = false,
  size = "md",
}: {
  user?: PlatformUser;
  extended?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className={`${size === "sm" ? "size-6" : size === "md" ? "size-8" : "size-10"}`}>
        <AvatarImage
          src={user?.avatarUrls?.["48x48"]}
          alt={user?.displayName || "User Avatar"}
          title={user?.displayName || "User Avatar"}
        />
        <AvatarFallback>
          <Icon
            path={mdiAccountOutline}
            className={`${size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-6"}`}
            title="Unassigned"
            colorScheme="neutral"
          />
        </AvatarFallback>
      </Avatar>
      {extended && (
        <span className="text-sm text-gray-700">{user?.displayName || "Unassigned"}</span>
      )}
    </div>
  );
}
