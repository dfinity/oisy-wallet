import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test } from '@playwright/test';
import { HomepageLoggedIn, HomepageLoggedOut } from './utils/pages/homepage.page';

test('should display homepage in logged out state', async ({ page }) => {
	const homepageLoggedOut = new HomepageLoggedOut({ page });

	await homepageLoggedOut.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});

testWithII('should display homepage in logged in state', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});
