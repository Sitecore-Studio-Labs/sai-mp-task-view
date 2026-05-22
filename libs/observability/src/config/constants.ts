/**
 * How many minutes of manual work is saved for each AI-generated subtask the user publishes.
 * Overridable via NEXT_PUBLIC_AI_TIME_SAVED_PER_SUBTASK_MIN env var so product/ops can
 * tune the estimate without a code deploy.
 */
export const AI_TIME_SAVED_PER_SUBTASK_MIN: number =
  Number(process.env.NEXT_PUBLIC_AI_TIME_SAVED_PER_SUBTASK_MIN) || 7;
