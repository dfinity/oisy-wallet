import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { ExplorerPage } from './utils/pages/explorer.page';

test.describe('Explorer Page', () => {
	testWithII('should display explorer page', async ({ page, iiPage, isMobile }) => {
		const explorerPage = new ExplorerPage({ page, iiPage, isMobile });

		await explorerPage.waitForReady();

		await explorerPage.takeScreenshot();
	});
});
