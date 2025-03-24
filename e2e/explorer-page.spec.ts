import { testWithII } from '@dfinity/internet-identity-playwright';
import { ExplorerPage } from './utils/pages/explorer.page';

testWithII('should display explorer page', async ({ page, iiPage, isMobile }) => {
	const explorerPage = new ExplorerPage({ page, iiPage, isMobile });

	await explorerPage.waitForReady();

	await explorerPage.takeScreenshot();
});
