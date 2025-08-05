import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { TestnetCases, TestnetsPage } from './utils/pages/testnets.page';

test.describe('Enable Testnets', () => {
	TestnetCases.forEach(({ networkSymbol, tokenSymbol }) => {
		testWithII(`should enable ${networkSymbol} network`, async ({ page, iiPage, isMobile }) => {
			await page.clock.install();

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
});
