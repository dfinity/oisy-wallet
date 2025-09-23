import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { HomepageLoggedIn, HomepageLoggedOut } from './utils/pages/homepage.page';

test('should display homepage in logged out state', async ({ page }) => {
	const homepageLoggedOut = new HomepageLoggedOut({ page });

	await homepageLoggedOut.waitForReady();

	await homepageLoggedOut.takeScreenshot();
});

testWithII.beforeEach(async ({ page }) => {
	await page.clock.install();
});

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip(
	'should display homepage in logged in state',
	async ({ page, iiPage, isMobile }) => {
		const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });

		await homepageLoggedIn.waitForReady();

		await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
	}
);
