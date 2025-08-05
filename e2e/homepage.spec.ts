import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { HomepageLoggedIn, HomepageLoggedOut } from './utils/pages/homepage.page';

test.describe('Homepage Logged Out', () => {
	test('should display homepage in logged out state', async ({ page }) => {
		const homepageLoggedOut = new HomepageLoggedOut({ page });

		await homepageLoggedOut.waitForReady();

		await homepageLoggedOut.takeScreenshot();
	});
});

test.describe('Homepage Logged In', () => {
	testWithII('should display homepage in logged in state', async ({ page, iiPage, isMobile }) => {
		await page.clock.install();

		const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });

		await homepageLoggedIn.waitForReady();

		await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
	});
});
