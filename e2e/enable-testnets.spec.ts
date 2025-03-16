import { testWithII } from '@dfinity/internet-identity-playwright';
import { TestnetCases, TestnetsPage } from './utils/pages/testnets.page';

TestnetCases.forEach(({ networkSymbol, tokenSymbol }) => {
	testWithII.beforeEach(async ({ page }) => {
		await page.clock.install();
	});

	testWithII(`should enable ${networkSymbol} network`, async ({ page, iiPage }) => {
		const testnetsPage = new TestnetsPage({ page, iiPage });
		await testnetsPage.waitForReady();
		await testnetsPage.enableTestnets({ networkSymbol, tokenSymbol });
		await testnetsPage.takeScreenshot({ freezeCarousel: true });
	});
});
