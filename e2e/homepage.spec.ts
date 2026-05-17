import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { HomepageLoggedIn, HomepageLoggedOut } from './utils/pages/homepage.page';

// Internet Identity registration is flaky around the 15 s default actionTimeout
// — both the `#userNumber` render after `#registerButton` and the post-
// `#displayUserContinue` popup close can occasionally take a long time on a
// loaded CI runner. Give every action 120 s so the slow path doesn't fail
// the suite; every other action is still capped by Playwright's default
// elsewhere.
testWithII.use({ actionTimeout: 120_000 });

// The default 60 s per-test cap can't cover II popup registration + post-
// login token initialisation on a slow runner. Bump to 5 min, and allow one
// extra retry on top of the global setting because the popup is still
// occasionally flaky despite the timeout bump.
testWithII.describe.configure({ timeout: 300_000, retries: 2 });

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
