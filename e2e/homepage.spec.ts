import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { HomepageLoggedIn, HomepageLoggedOut } from './utils/pages/homepage.page';

// Internet Identity registration is flaky around the 15 s default actionTimeout
// (the popup occasionally takes longer than that to render `#userNumber` after
// `#registerButton` is clicked). Give it 60 s so the slow path doesn't fail
// the suite — every other action is still capped by Playwright's default.
testWithII.use({ actionTimeout: 60_000 });

// Per-test cap. The default 60 s isn't enough to cover both the II popup
// registration AND the post-login token initialisation (each can take 30 s+
// on a slow CI runner). Bump to 3 min for this file only.
testWithII.describe.configure({ timeout: 180_000 });

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
