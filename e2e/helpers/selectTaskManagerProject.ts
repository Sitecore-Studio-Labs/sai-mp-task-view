import type { Page } from "@playwright/test";

/** Opens edit mode and the Jira project react-select menu (options visible). */
export async function openTaskManagerJiraProjectDropdown(page: Page) {
  await page.getByRole("button", { name: "Change project and site" }).click();
  await page.getByRole("combobox", { name: "Jira site" }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("combobox", { name: "Jira project" }).click();
}

/**
 * ProjectSiteCard: enter edit mode via "Change project and site", then pick a site and project
 * (react-select comboboxes with aria-label "Jira site" / "Jira project").
 */
export async function selectTaskManagerJiraProject(page: Page, projectName: string) {
  await openTaskManagerJiraProjectDropdown(page);
  await page.getByRole("option", { name: projectName, exact: true }).click();
}
