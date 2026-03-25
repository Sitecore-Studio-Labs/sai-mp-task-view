import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    const homeTitle = page.getByTestId("home-page-title");
    await expect(homeTitle).toBeVisible();
  });
});
