import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { MODAL_VIEWPORT_HEIGHT, MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

let homepageLoggedIn: HomepageLoggedIn;

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
	await homepageLoggedIn.activateTestnetSettings();
	await homepageLoggedIn.toggleTokenInList({
		tokenSymbol: 'ckSepoliaETH',
		networkSymbol: 'ICP'
	});
	await expect(
		homepageLoggedIn.getTokenCardLocator({
			tokenSymbol: 'ckSepoliaETH',
			networkSymbol: 'ICP'
		})
	).toBeVisible();
	await homepageLoggedIn.waitForLoadState();
	await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.waitForLoadState();
	await homepageLoggedIn.takeScreenshot();
	await homepageLoggedIn.toggleTokenInList({
		tokenSymbol: 'ckSepoliaETH',
		networkSymbol: 'ICP'
	});
	await expect(
		homepageLoggedIn.getTokenCardLocator({
			tokenSymbol: 'ckSepoliaETH',
			networkSymbol: 'ICP'
		})
	).not.toBeVisible();
});

testWithII('should enable and disable ERC20 token', async () => {
	await homepageLoggedIn.activateTestnetSettings();
	await homepageLoggedIn.toggleTokenInList({
		tokenSymbol: 'SHIB',
		networkSymbol: 'ETH'
	});
	await expect(
		homepageLoggedIn.getTokenCardLocator({
			tokenSymbol: 'SHIB',
			networkSymbol: 'ETH'
		})
	).toBeVisible();
	await homepageLoggedIn.waitForLoadState();
	await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.waitForLoadState();
	await homepageLoggedIn.takeScreenshot();
	await homepageLoggedIn.toggleTokenInList({
		tokenSymbol: 'SHIB',
		networkSymbol: 'ETH'
	});
	await expect(
		homepageLoggedIn.getTokenCardLocator({
			tokenSymbol: 'SHIB',
			networkSymbol: 'ETH'
		})
	).not.toBeVisible();
});

testWithII('should enable and disable SepoliaERC20 token', async () => {
	await homepageLoggedIn.activateTestnetSettings();
	await homepageLoggedIn.toggleTokenInList({
		tokenSymbol: 'USDC',
		networkSymbol: 'SepoliaETH'
	});
	await expect(
		homepageLoggedIn.getTokenCardLocator({
			tokenSymbol: 'USDC',
			networkSymbol: 'SepoliaETH'
		})
	).toBeVisible();
	await homepageLoggedIn.waitForLoadState();
	await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.waitForLoadState();
	await homepageLoggedIn.takeScreenshot();
	await homepageLoggedIn.toggleTokenInList({
		tokenSymbol: 'USDC',
		networkSymbol: 'SepoliaETH'
	});
	await expect(
		homepageLoggedIn.getTokenCardLocator({
			tokenSymbol: 'USDC',
			networkSymbol: 'SepoliaETH'
		})
	).not.toBeVisible();
});
