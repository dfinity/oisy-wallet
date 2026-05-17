import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { HomepageLoggedIn, HomepageLoggedOut } from './utils/pages/homepage.page';

test('should display homepage in logged out state', async ({ page }) => {
	const homepageLoggedOut = new HomepageLoggedOut({ page });

	await homepageLoggedOut.waitForReady();

	await homepageLoggedOut.takeScreenshot();
});

testWithII.beforeEach(async ({ page }) => {
	// Internet Identity registration needs a WebAuthn virtual authenticator.
	// Playwright only ships one for desktop Chromium; Firefox has no such API,
	// and the Pixel 7 mobile emulation triggers an alternate II popup flow we
	// don't drive. Skip those projects rather than hang on the `#userNumber`
	// locator until `actionTimeout` fires.
	const testInfo = testWithII.info();
	testInfo.skip(
		testInfo.project.name !== 'Google Chrome',
		'Internet Identity login is only validated on the Google Chrome project.'
	);

	await page.clock.install();
});

testWithII('should display homepage in logged in state', async ({ page, iiPage, isMobile }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });

	await homepageLoggedIn.waitForReady();

	await homepageLoggedIn.takeScreenshot();
});
