import type { PlatformE2eConfig } from "../config/platform-e2e-config";

export const MOCK_ISSUE_DESCRIPTION_TEXT = "Issue description text.";

export const MOCK_ISSUE_DESCRIPTION_ADF = {
  type: "doc",
  version: 1,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: MOCK_ISSUE_DESCRIPTION_TEXT }],
    },
  ],
};

export const MOCK_COMMENT_TEXT = "This is a test comment.";

export const MOCK_COMMENT_BODY_ADF = {
  type: "doc",
  version: 1,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: MOCK_COMMENT_TEXT }],
    },
  ],
};

/** Issue/comment body shape matching the platform's {@link PlatformE2eConfig.richTextFormat}. */
export function buildMockRichTextBody(
  config: PlatformE2eConfig,
  plainText: string = MOCK_ISSUE_DESCRIPTION_TEXT,
): string | typeof MOCK_ISSUE_DESCRIPTION_ADF {
  return config.richTextFormat === "adf" ? MOCK_ISSUE_DESCRIPTION_ADF : plainText;
}
