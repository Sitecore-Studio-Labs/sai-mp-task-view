import { expect, type Page } from "@playwright/test";

import { TestIds } from "../constants/test-ids";
import { selectReactOptionInContainer } from "../utils/select-helpers";

export async function assertActiveScopeCard(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.activeScopeCard)).toBeVisible();
}

export async function clickChangeActiveScope(page: Page): Promise<void> {
  await page.getByTestId(TestIds.changeActiveScope).click();
}

export async function clickResetActiveScope(page: Page): Promise<void> {
  await page.getByTestId(TestIds.resetActiveScope).click();
}

export async function selectActiveSiteByLabel(page: Page, optionLabel: string): Promise<void> {
  await selectReactOptionInContainer(page, TestIds.activeScopeSiteSelect, "Site", optionLabel);
}

export async function selectActiveProjectByLabel(
  page: Page,
  scopeLabel: string,
  optionLabel: string,
): Promise<void> {
  await selectReactOptionInContainer(
    page,
    TestIds.activeScopeProjectSelect,
    scopeLabel,
    optionLabel,
  );
}
