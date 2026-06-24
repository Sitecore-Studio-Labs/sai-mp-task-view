import { expect, type Page } from "@playwright/test";

import { APP_READY_TIMEOUT } from "../constants/timeouts";

/** Select an option in a react-select combobox scoped under a data-testid container. */
export async function selectReactOptionInContainer(
  page: Page,
  containerTestId: string,
  comboboxName: string | RegExp,
  optionLabel: string,
): Promise<void> {
  const container = page.getByTestId(containerTestId);
  const combobox = container.getByRole("combobox", { name: comboboxName });
  await expect(combobox).toBeEnabled({ timeout: APP_READY_TIMEOUT });
  await combobox.click();

  const listbox = page.locator('[role="listbox"]').last();
  await expect(listbox).toBeVisible({ timeout: APP_READY_TIMEOUT });

  const roleOption = listbox.getByRole("option", { name: optionLabel, exact: true });
  if ((await roleOption.count()) > 0) {
    await roleOption.click();
    return;
  }

  await listbox.getByText(optionLabel, { exact: true }).click();
}

/** Select an option via a shadcn/radix Select trigger testId. */
export async function selectShadcnOptionByTestId(
  page: Page,
  triggerTestId: string,
  optionLabel: string,
): Promise<void> {
  await page.getByTestId(triggerTestId).click();

  const listbox = page.locator('[role="listbox"]').last();
  await expect(listbox).toBeVisible({ timeout: APP_READY_TIMEOUT });

  const roleOption = listbox.getByRole("option", { name: optionLabel, exact: true });
  if ((await roleOption.count()) > 0) {
    await roleOption.click();
    return;
  }

  await listbox.getByText(optionLabel, { exact: true }).click();
}

/** Open a multi-select filter dropdown by testId and toggle an option. */
export async function toggleMultiSelectFilterOption(
  page: Page,
  filterTestId: string,
  optionLabel: string,
): Promise<void> {
  await page.getByTestId(filterTestId).click();

  const listbox = page.locator('[role="listbox"]').last();
  await expect(listbox).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await listbox.getByRole("option", { name: optionLabel, exact: true }).click();
}
