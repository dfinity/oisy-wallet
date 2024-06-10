import { expect, test } from "@playwright/test";

const testUrl = "/";

test("Should display not logged in homepage", async ({ page }) => {
    await page.goto(testUrl);

    await expect(page).toHaveScreenshot();
});
