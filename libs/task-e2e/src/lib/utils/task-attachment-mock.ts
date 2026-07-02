import type { Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { APP_READY_TIMEOUT } from "../constants/timeouts";
import { apiPrefixPattern, issueAttachmentsUploadPattern } from "./task-list-mock";

export type MockTaskAttachment = {
  id: string;
  filename: string;
};

export const E2E_EXISTING_ATTACHMENT_ID = "att-existing-1";
export const E2E_EXISTING_ATTACHMENT_FILENAME = "existing-spec.pdf";
export const E2E_NEW_ATTACHMENT_FILENAME = "e2e-upload.pdf";

export const E2E_SAMPLE_EXISTING_ATTACHMENT: MockTaskAttachment = {
  id: E2E_EXISTING_ATTACHMENT_ID,
  filename: E2E_EXISTING_ATTACHMENT_FILENAME,
};

function attachmentIdFromPath(pathname: string, platformName: string): string | null {
  const match = pathname.match(new RegExp(`/api/${platformName}/attachment/([^/?]+)`));
  return match?.[1] ?? null;
}

function issueKeyFromUploadPath(pathname: string, platformName: string): string | null {
  const match = pathname.match(new RegExp(`/api/${platformName}/issues/([^/]+)/attachments`));
  return match?.[1] ?? null;
}

/** Register before deleting an attachment from the edit-task form. */
export function beginWaitingForAttachmentDelete(
  page: Page,
  config: PlatformE2eConfig,
  attachmentId = E2E_EXISTING_ATTACHMENT_ID,
): Promise<void> {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes(`/api/${config.platformName}/attachment/${attachmentId}`) &&
        response.request().method() === "DELETE" &&
        response.ok(),
      { timeout: APP_READY_TIMEOUT },
    )
    .then(() => undefined);
}

/** Register before uploading attachments (create/edit after task key is known, or any issue key). */
export function beginWaitingForAttachmentUpload(
  page: Page,
  config: PlatformE2eConfig,
  issueKey?: string,
): Promise<void> {
  return page
    .waitForResponse(
      (response) => {
        if (response.request().method() !== "POST" || !response.ok()) {
          return false;
        }

        const key = issueKeyFromUploadPath(new URL(response.url()).pathname, config.platformName);
        if (!key) {
          return false;
        }

        return issueKey ? key === issueKey : true;
      },
      { timeout: APP_READY_TIMEOUT },
    )
    .then(() => undefined);
}

/**
 * Mocks attachment download/delete and multipart upload routes.
 * Mutates `liveAttachments` in place for upload and delete operations.
 */
export async function installTaskAttachmentApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  liveAttachments: MockTaskAttachment[],
): Promise<void> {
  if (!config.hasAttachments) {
    return;
  }

  let nextAttachmentId = liveAttachments.length;

  await page.route(apiPrefixPattern(config, "/attachment/"), async (route) => {
    const url = new URL(route.request().url());
    const attachmentId = attachmentIdFromPath(url.pathname, config.platformName);
    if (!attachmentId) {
      await route.continue();
      return;
    }

    if (route.request().method() === "DELETE") {
      const index = liveAttachments.findIndex((attachment) => attachment.id === attachmentId);
      if (index >= 0) {
        liveAttachments.splice(index, 1);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: "%PDF-1.4 e2e attachment",
      });
      return;
    }

    await route.continue();
  });

  await page.route(issueAttachmentsUploadPattern(config), async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    nextAttachmentId += 1;
    const uploaded: MockTaskAttachment = {
      id: `att-${nextAttachmentId}`,
      filename: E2E_NEW_ATTACHMENT_FILENAME,
    };
    liveAttachments.push(uploaded);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(uploaded),
    });
  });
}
