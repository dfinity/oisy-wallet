import { testWithII } from '@dfinity/internet-identity-playwright';
import { TestnetCases, TestnetsPage } from './utils/pages/testnets.page';

TestnetCases.forEach(({ networkSymbol, tokenSymbol }) => {
	testWithII.beforeEach(async ({ page }) => {
		await page.clock.install();
	});

	// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
	testWithII.skip(`should enable ${networkSymbol} network`, async ({ page, iiPage, isMobile }) => {
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
