import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH, MODAL_VIEWPORT_HEIGHT } from './utils/constants/e2e.constants';
import { ManageTokensCases, ManageTokensPage } from './utils/pages/manage-tokens.page';


testWithII('should enable and disable SepoliaERC20 token', async () => {
	await enableAndDisableToken({
		page: homepageLoggedIn,
		tokenSymbol: 'USDC',
		networkSymbol: 'SepoliaETH'
	});
});

testWithII('should enable and disable SPL token', async () => {
	await enableAndDisableToken({
		page: homepageLoggedIn,
		tokenSymbol: 'EURC',
		networkSymbol: 'SOL'
	});
});

testWithII('should enable and disable DevnetSPL token', async () => {
	await enableAndDisableToken({
		page: homepageLoggedIn,
		tokenSymbol: 'DevnetEURC',
		networkSymbol: 'SOL (Devnet)'

    
ManageTokensCases.forEach(({ type, tokenSymbol, networkSymbol }) => {
	testWithII(`should enable and disable ${type} token`, async ({ page, iiPage, isMobile }) => {
		const manageTokensPage = new ManageTokensPage({
			page,
			iiPage,
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
