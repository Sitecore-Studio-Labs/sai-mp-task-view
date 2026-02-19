import { aiOutputSchema } from "@/schemas/workbreakdown-schema";
import { validateAndNormalize } from "./workbreakdown-normalize";

/** Extract JSON from AI response (handle markdown code blocks). */
export function extractJsonFromResponse(text: string): unknown {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

/**
 * Parse and validate AI output into a normalized work breakdown.
 * Throws on invalid JSON or schema validation failure.
 */
export function parseAiWorkBreakdown(
  rawResponse: string,
  draftId: string,
  projectKey?: string,
  platform?: string,
) {
  const parsed = extractJsonFromResponse(rawResponse);
  const validated = aiOutputSchema.parse(parsed);
  return validateAndNormalize(
    validated,
    draftId,
    projectKey,
    platform,
  );
}
