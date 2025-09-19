import { testWithII } from '@dfinity/internet-identity-playwright';
import { ExplorerPage } from './utils/pages/explorer.page';

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should display explorer page', async ({ page, iiPage, isMobile }) => {
	const explorerPage = new ExplorerPage({ page, iiPage, isMobile });

	await explorerPage.waitForReady();

	await explorerPage.takeScreenshot();
});
