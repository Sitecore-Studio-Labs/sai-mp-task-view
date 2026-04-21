import type { ComponentType } from "react";

import type { UIFeature } from "./capability-engine";

export const FEATURE_COMPONENTS: Record<UIFeature, ComponentType> = {
  status: () => null,
  assign: () => null,
  attachments: () => null,
  comments: () => null,
  projects: () => null,
};
