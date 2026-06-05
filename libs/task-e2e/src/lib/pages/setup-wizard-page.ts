import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { TestIds } from "../constants/test-ids";
import { selectReactOptionInContainer } from "../utils/select-helpers";

function resolveScopePickerPrefix(config: PlatformE2eConfig): string {
  return config.setupScopePickerTestId ?? "scope-picker";
}

export async function clickWizardGetStarted(page: Page): Promise<void> {
  await page.getByTestId(TestIds.wizardGetStarted).click();
}

export async function clickWizardGoToMapping(page: Page): Promise<void> {
  await page.getByTestId(TestIds.wizardGoToMapping).click();
}

export async function clickWizardAddMapping(page: Page): Promise<void> {
  await page.getByTestId(TestIds.wizardAddMapping).click();
}

export async function clickWizardGetStartedStep2(page: Page): Promise<void> {
  await page.getByTestId(TestIds.wizardGetStartedStep2).click();
}

export async function clickWizardBackStep1(page: Page): Promise<void> {
  await page.getByTestId(TestIds.wizardBackStep1).click();
}

export async function toggleSetupScopeEdit(page: Page, config: PlatformE2eConfig): Promise<void> {
  const prefix = resolveScopePickerPrefix(config);
  await page.getByTestId(TestIds.setupScopeToggleEdit(prefix)).click();
}

export async function selectSetupScopeByLabel(
  page: Page,
  config: PlatformE2eConfig,
  levelId: string,
  scopeLabel: string,
  optionLabel: string,
): Promise<void> {
  const prefix = resolveScopePickerPrefix(config);
  await selectReactOptionInContainer(
    page,
    TestIds.setupScopeLevel(prefix, levelId),
    `Select ${scopeLabel}`,
    optionLabel,
  );
}

export async function assertWebsiteMappingsSection(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.websiteMappingsSection)).toBeVisible();
}

export async function toggleWebsiteMappingsSection(page: Page): Promise<void> {
  await page.getByTestId(TestIds.websiteMappingsSectionToggle).click();
}

export async function assertMappingBox(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.mappingBox)).toBeVisible();
}

export async function selectMappingScopeByLabel(
  page: Page,
  levelId: string,
  scopeLabel: string,
  optionLabel: string,
): Promise<void> {
  await selectReactOptionInContainer(page, TestIds.mappingLevel(levelId), scopeLabel, optionLabel);
}
