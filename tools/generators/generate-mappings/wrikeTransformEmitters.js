// @ts-check
"use strict";

/**
 * Code emission for Wrike-specific mapping transforms declared in capabilities/wrike.api.yaml.
 * Kept separate from generateMappings.js so Jira/Monday generators stay lean.
 */

/** @type {Record<string, string[]>} */
const TRANSFORM_RESOLUTION_MAPS = {
  "wrike-contact-stub": ["contactMap"],
  "wrike-first-contact": ["contactMap"],
  "wrike-status": ["statusMap"],
};

/** @param {string} transform */
function transformUsesMaps(transform) {
  return TRANSFORM_RESOLUTION_MAPS[transform] ?? [];
}

/**
 * @param {string} name
 * @param {any} def
 * @param {string} src  e.g. "raw.authorId"
 * @param {string} indent
 * @returns {string | null}
 */
function emitWrikeTransform(name, def, src, indent) {
  switch (def.transform) {
    case "wrike-contact-stub":
      return (
        `${indent}${name}: (() => {\n` +
        `${indent}  const contact = raw.authorId ? contactMap.get(raw.authorId) : undefined;\n` +
        `${indent}  return contact\n` +
        `${indent}    ? {\n` +
        `${indent}        accountId: contact.id,\n` +
        `${indent}        displayName: \`\${contact.firstName} \${contact.lastName}\`.trim(),\n` +
        `${indent}        avatarUrls: contact.avatarUrl ? { "48x48": contact.avatarUrl } : undefined,\n` +
        `${indent}      }\n` +
        `${indent}    : { accountId: raw.authorId ?? "", displayName: raw.authorId ?? "Unknown" };\n` +
        `${indent}})(),`
      );

    case "wrike-first-contact": {
      const idExpr = src.includes("responsibleIds")
        ? "raw.responsibleIds?.[0]"
        : "raw.authorIds?.[0]";
      return (
        `${indent}${name}: (() => {\n` +
        `${indent}  const id = ${idExpr};\n` +
        `${indent}  const contact = id ? contactMap.get(id) : undefined;\n` +
        `${indent}  if (!contact) return undefined;\n` +
        `${indent}  return {\n` +
        `${indent}    accountId: contact.id,\n` +
        `${indent}    displayName: \`\${contact.firstName} \${contact.lastName}\`.trim(),\n` +
        `${indent}    avatarUrls: contact.avatarUrl ? { "48x48": contact.avatarUrl } : undefined,\n` +
        `${indent}  };\n` +
        `${indent}})(),`
      );
    }

    case "wrike-status":
      return (
        `${indent}${name}: (() => {\n` +
        `${indent}  const customStatus = raw.customStatusId ? statusMap.get(raw.customStatusId) : undefined;\n` +
        `${indent}  if (customStatus) {\n` +
        `${indent}    const standardName = customStatus.standardName;\n` +
        `${indent}    const statusCategory =\n` +
        `${indent}      standardName === "Completed"\n` +
        `${indent}        ? { key: "done", name: "Done" }\n` +
        `${indent}        : standardName === "Active"\n` +
        `${indent}          ? { key: "indeterminate", name: "In Progress" }\n` +
        `${indent}          : { key: "undefined", name: standardName };\n` +
        `${indent}    return { id: customStatus.id, name: customStatus.name, statusCategory };\n` +
        `${indent}  }\n` +
        `${indent}  return {\n` +
        `${indent}    id: raw.customStatusId ?? "unknown",\n` +
        `${indent}    name: raw.customStatusId ?? "Unknown",\n` +
        `${indent}    statusCategory: { key: "undefined", name: "Unknown" },\n` +
        `${indent}  };\n` +
        `${indent}})(),`
      );

    case "wrike-importance":
      return `${indent}${name}: raw.importance ? { id: raw.importance, name: raw.importance } : undefined,`;

    case "wrike-task-issuetype":
      return `${indent}${name}: { id: "task", name: "Task" },`;

    case "wrike-subtask-stubs":
      return (
        `${indent}subtasks: raw.subTaskIds?.map((id) => ({\n` +
        `${indent}  id,\n` +
        `${indent}  key: id,\n` +
        `${indent}  fields: {\n` +
        `${indent}    summary: "",\n` +
        `${indent}    status: { id: "", name: "", statusCategory: { key: "undefined", name: "Unknown" } },\n` +
        `${indent}    issuetype: { id: "task", name: "Task" },\n` +
        `${indent}  },\n` +
        `${indent}})),`
      );

    case "wrike-parent-stub":
      return (
        `${indent}parent: raw.superTaskIds?.[0]\n` +
        `${indent}  ? { id: raw.superTaskIds[0], key: raw.superTaskIds[0], summary: "" }\n` +
        `${indent}  : undefined,`
      );

    case "wrike-attachment-stub":
      return (
        `${indent}attachment: raw.hasAttachments\n` +
        `${indent}  ? [{ id: "attachments", filename: "Attachments" }]\n` +
        `${indent}  : undefined,`
      );

    case "wrike-full-name":
      return `${indent}displayName: \`\${raw.firstName ?? ""} \${raw.lastName ?? ""}\`.trim() || raw.id,`;

    case "wrike-avatar-map":
      return `${indent}avatarUrls: raw.avatarUrl ? { "48x48": raw.avatarUrl } : undefined,`;

    default:
      return null;
  }
}

/** @type {Set<string>} */
const WRIKE_TRANSFORMS = new Set(
  Object.keys(TRANSFORM_RESOLUTION_MAPS).concat([
    "wrike-importance",
    "wrike-task-issuetype",
    "wrike-subtask-stubs",
    "wrike-parent-stub",
    "wrike-attachment-stub",
    "wrike-full-name",
    "wrike-avatar-map",
  ]),
);

module.exports = {
  WRIKE_TRANSFORMS,
  transformUsesMaps,
  emitWrikeTransform,
};
