import { testWithII } from '@dfinity/internet-identity-playwright';
import { SettingsPage } from './utils/pages/settings.page';

// Internet Identity registration is flaky around the 15 s default actionTimeout
// (the popup occasionally takes longer than that to render `#userNumber` after
// `#registerButton` is clicked). Give it 60 s so the slow path doesn't fail
// the suite — every other action is still capped by Playwright's default.
testWithII.use({ actionTimeout: 60_000 });

testWithII.beforeEach(() => {
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
});

testWithII('should display settings page', async ({ page, iiPage, isMobile }) => {
	const settingsPage = new SettingsPage({ page, iiPage, isMobile });

	await settingsPage.waitForReady();

	await settingsPage.takeScreenshot();
});
