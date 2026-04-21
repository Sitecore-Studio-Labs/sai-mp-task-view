import type { ReactNode } from "react";

import type { UIFeature } from "./capability-engine";
import { getEnabledFeatures } from "./capability-engine";
import { getPlatformUISchema } from "./platform-ui-schema";
import type { UISchema } from "./ui-schema-types";

/**
 * Schema `feature.key` values use capability ids (e.g. `tasks.status`).
 * {@link getEnabledFeatures} returns short {@link UIFeature} ids — map here without touching the engine.
 */
const SCHEMA_FEATURE_KEY_TO_UI_FEATURE: Partial<Record<string, UIFeature>> = {
  "tasks.status": "status",
  "tasks.assign": "assign",
  "tasks.attachments": "attachments",
  "tasks.comments": "comments",
  "projects.read": "projects",
};

function isSchemaFeatureEnabled(schemaKey: string, features: UIFeature[]): boolean {
  const uiFeature = SCHEMA_FEATURE_KEY_TO_UI_FEATURE[schemaKey];
  return uiFeature != null && features.includes(uiFeature);
}

export function renderNode(node: UISchema, features: UIFeature[]): ReactNode {
  if (node.type === "container") {
    return node.children.map((child, i) => <div key={i}>{renderNode(child, features)}</div>);
  }

  if (node.type === "feature") {
    if (!isSchemaFeatureEnabled(node.key, features)) return null;

    return <div>{node.key}</div>;
  }

  if (node.type === "component") {
    return <div>{node.name}</div>;
  }

  return null;
}

export function DynamicUI({ platform }: { platform: string }) {
  const features = getEnabledFeatures(platform);
  const schema = getPlatformUISchema(platform);

  return <div>{renderNode(schema, features)}</div>;
}
