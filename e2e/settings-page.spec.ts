import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { SettingsPage } from './utils/pages/settings.page';

test.describe('Settings Page', () => {
	testWithII('should display settings page', async ({ page, iiPage, isMobile }) => {
		const settingsPage = new SettingsPage({ page, iiPage, isMobile });

		await settingsPage.waitForReady();

		await settingsPage.takeScreenshot();
	});
});
