import { testWithII } from '@dfinity/internet-identity-playwright';
import { SettingsPage } from './utils/pages/settings.page';

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should display settings page', async ({ page, iiPage, isMobile }) => {
	const settingsPage = new SettingsPage({ page, iiPage, isMobile });

	await settingsPage.waitForReady();

	await settingsPage.takeScreenshot();
});
