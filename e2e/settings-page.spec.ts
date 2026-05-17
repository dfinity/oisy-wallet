import { testWithII } from '@dfinity/internet-identity-playwright';
import { SettingsPage } from './utils/pages/settings.page';

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
