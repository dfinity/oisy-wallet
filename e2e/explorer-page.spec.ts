import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { ExplorerPage } from './utils/pages/explorer.page';

testWithII('should display explorer page', async ({ page, iiPage }) => {
	const explorerPage = new ExplorerPage({ page, iiPage });

	await explorerPage.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});
