import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { MODAL_VIEWPORT_HEIGHT, MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

let homepageLoggedIn: HomepageLoggedIn;

const enableAndDisableToken = async ({
	page,
	tokenSymbol,
	networkSymbol
}: {
	page: HomepageLoggedIn;
	tokenSymbol: string;
	networkSymbol: string;
}) => {
	await page.activateTestnetSettings();
	await page.toggleTokenInList({
		tokenSymbol,
		networkSymbol
	});
	await expect(
		page.getTokenCardLocator({
			tokenSymbol,
			networkSymbol
		})
	).toBeVisible();
	await page.waitForLoadState();
	await page.setCarouselFirstSlide();
	await page.waitForLoadState();
	await page.takeScreenshot();
	await page.toggleTokenInList({
		tokenSymbol,
		networkSymbol
	});
	await expect(
		page.getTokenCardLocator({
			tokenSymbol,
			networkSymbol
		})
	).not.toBeVisible();
};

testWithII.beforeEach(async ({ page, iiPage, isMobile }) => {
	homepageLoggedIn = new HomepageLoggedIn({
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

	await homepageLoggedIn.waitForReady();
});

testWithII('should enable and disable ICRC token', async () => {
	await enableAndDisableToken({
		page: homepageLoggedIn,
		tokenSymbol: 'ckSepoliaETH',
		networkSymbol: 'ICP'
	});
});

testWithII('should enable and disable ERC20 token', async () => {
	await enableAndDisableToken({
		page: homepageLoggedIn,
		tokenSymbol: 'SHIB',
		networkSymbol: 'ETH'
	});
});

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
		networkSymbol: 'Customize Toolbar…'
	});
});
