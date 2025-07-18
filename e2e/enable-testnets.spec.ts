import { testWithII } from '@dfinity/internet-identity-playwright';
import { TestnetCases, TestnetsPage } from './utils/pages/testnets.page';

TestnetCases.forEach(({ networkSymbol, tokenSymbol }) => {
	testWithII.beforeEach(async ({ page }) => {
		await page.clock.install();
	});

	testWithII(`should enable ${networkSymbol} network`, async ({ page, iiPage, isMobile }) => {
		const testnetsPage = new TestnetsPage({ page, iiPage, isMobile });
		await testnetsPage.waitForReady();
		await testnetsPage.enableTestnets({ networkSymbol, tokenSymbol });
		const tokenCardTestId = testnetsPage.getTokenCardTestId({ tokenSymbol, networkSymbol });
		await testnetsPage.takeScreenshot({
			freezeCarousel: true,
			centeredElementTestId: tokenCardTestId
		});
	});
});
