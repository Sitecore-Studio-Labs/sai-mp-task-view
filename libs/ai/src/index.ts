// Types
export type {
  ParseRequirementsBody,
  ParseRequirementsResponse,
  WorkBreakdown,
  WorkItem,
  WorkItemMetadata,
  WorkItemType,
} from "./types/workbreakdown";

// Schemas
export type {
  AiOutputSchema,
  WorkBreakdownSchema,
  WorkItemSchema,
} from "./schemas/workbreakdown-schema";
export { aiOutputSchema, workBreakdownSchema } from "./schemas/workbreakdown-schema";

// AI
export { generateWorkBreakdownWithOpenAI } from "./lib/ai-openai";
export { extractJsonFromResponse, parseAiWorkBreakdown } from "./lib/ai-parse-requirements";
export { stubParseRequirements } from "./lib/ai-stub";
export type { RawWorkItem } from "./lib/workbreakdown-normalize";
export { normalizeWorkBreakdown, validateAndNormalize } from "./lib/workbreakdown-normalize";

// Draft store
export {
  addChildInDraft,
  deleteDraft,
  deleteNodeInDraft,
  generateDraftId,
  getDraft,
  setDraft,
  updateNodeInDraft,
} from "./lib/workbreakdown-store";

// Prompts
export { WORK_BREAKDOWN_SYSTEM_PROMPT, WORK_BREAKDOWN_USER_PROMPT } from "./prompts/work-breakdown";
