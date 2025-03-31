import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH, MODAL_VIEWPORT_HEIGHT } from './utils/constants/e2e.constants';
import { ManageTokensCases, ManageTokensPage } from './utils/pages/manage-tokens.page';

ManageTokensCases.forEach(({ type, tokenSymbol, networkSymbol }) => {
	testWithII.beforeEach(async ({ page }) => {
		await page.clock.install();
	});

	testWithII(`should enable and disable ${type} token`, async ({ page, iiPage, isMobile }) => {
		const manageTokensPage = new ManageTokensPage({
			page,
			iiPage,
			isMobile,
			// TODO: check a better way to make the select network visible in the network switcher dropdown, otherwise the test will fail, since the network cannot be clicked
			viewportSize: !isMobile
				? {
						width: MODALS_VIEWPORT_WIDTH,
						height: MODAL_VIEWPORT_HEIGHT
					}
				: undefined
		});
		await manageTokensPage.waitForReady();
		await manageTokensPage.enableAndDisableToken({ tokenSymbol, networkSymbol });
	});
});
