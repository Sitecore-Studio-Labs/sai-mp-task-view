import type { Page } from "@playwright/test";

/** Select an option in a react-select combobox scoped under a data-testid container. */
export async function selectReactOptionInContainer(
  page: Page,
  containerTestId: string,
  comboboxName: string | RegExp,
  optionLabel: string,
): Promise<void> {
  const container = page.getByTestId(containerTestId);
  await container.getByRole("combobox", { name: comboboxName }).click();
  await page.getByRole("option", { name: optionLabel }).click();
}

/** Select an option via a shadcn/radix Select trigger testId. */
export async function selectShadcnOptionByTestId(
  page: Page,
  triggerTestId: string,
  optionLabel: string,
): Promise<void> {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole("option", { name: optionLabel }).click();
}

/** Open a multi-select filter dropdown by testId and toggle an option. */
export async function toggleMultiSelectFilterOption(
  page: Page,
  filterTestId: string,
  optionLabel: string,
): Promise<void> {
  await page.getByTestId(filterTestId).click();
  await page.getByRole("option", { name: optionLabel }).click();
}
