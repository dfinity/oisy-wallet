import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { SettingsPage } from './utils/pages/settings.page';

testWithII('should display settings page', async ({ page, iiPage }) => {
	const settingsPage = new SettingsPage({ page, iiPage });

	await settingsPage.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});
