import { testWithII } from '@dfinity/internet-identity-playwright';
import { TestnetCases, TestnetsPage } from './utils/pages/testnets.page';

TestnetCases.forEach(({ networkSymbol, tokenSymbol }) => {
	testWithII.beforeEach(async ({ page }) => {
		// Internet Identity registration needs a WebAuthn virtual authenticator.
		// Playwright only ships one for desktop Chromium; Firefox has no such API,
		// and the Pixel 7 mobile emulation triggers an alternate II popup flow we
		// don't drive. Skip those projects rather than hang on the `#userNumber`
		// locator until `actionTimeout` fires.
		const testInfo = testWithII.info();
		testInfo.skip(
			testInfo.project.name !== 'Google Chrome',
			'Internet Identity login is only validated on the Google Chrome project.'
		);

		await page.clock.install();
	});

	testWithII(`should enable ${networkSymbol} network`, async ({ page, iiPage, isMobile }) => {
		const testnetsPage = new TestnetsPage({ page, iiPage, isMobile });
		await testnetsPage.waitForReady();
		await testnetsPage.enableTestnets({ networkSymbol, tokenSymbol });
		const tokenCardTestId = testnetsPage.getTokenCardTestId({ tokenSymbol, networkSymbol });
		await testnetsPage.takeScreenshot({
			centeredElementTestId: tokenCardTestId
		});
	});
});
