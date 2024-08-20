import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test } from '@playwright/test';
import { Homepage, HomepageLoggedIn } from './utils/pages/homepage.page';

test('should display homepage in logged out state', async ({ page }) => {
	const homepage = new Homepage({ page });

	await homepage.waitForLoggedOut();

	await expect(page).toHaveScreenshot({ fullPage: true });
});

testWithII('should display homepage in logged in state', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForLoggedIn();

	await expect(page).toHaveScreenshot({ fullPage: true });
});
