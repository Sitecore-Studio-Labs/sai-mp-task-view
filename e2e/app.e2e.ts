import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "To get started, edit the page.tsx file",
      }),
    ).toBeVisible();
  });
});
