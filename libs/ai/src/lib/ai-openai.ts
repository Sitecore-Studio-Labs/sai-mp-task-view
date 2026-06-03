/**
 * OpenAI integration for work breakdown from business requirements.
 * Requires OPENAI_API_KEY in the environment.
 */

import OpenAI from "openai";

import {
  WORK_BREAKDOWN_SYSTEM_PROMPT,
  WORK_BREAKDOWN_USER_PROMPT,
} from "../prompts/work-breakdown";

const OPENAI_MODEL = "gpt-4o";

/**
 * Call OpenAI to generate a work breakdown from the given requirement text.
 * Returns the raw response content (expected to be JSON string).
 * @throws Error if API key is missing or the API call fails
 */
export async function generateWorkBreakdownWithOpenAI(requirementText: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local to use AI-generated task breakdown.",
    );
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: WORK_BREAKDOWN_SYSTEM_PROMPT },
      { role: "user", content: WORK_BREAKDOWN_USER_PROMPT(requirementText) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = completion.choices[0]?.message?.content;
  if (content == null || content.trim() === "") {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}
