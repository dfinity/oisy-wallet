import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

let homepageLoggedIn: HomepageLoggedIn;

testWithII.beforeEach(async ({ page, iiPage }) => {
	homepageLoggedIn = new HomepageLoggedIn({
		page,
		iiPage
	});

	await homepageLoggedIn.waitForReady();
});

testWithII('should enable and disable ICRC token', async () => {
	await homepageLoggedIn.activateTestnetSettings();
	await homepageLoggedIn.toggleTokenInList({
		tokenSymbol: 'ckSepoliaETH',
		networkName: 'Internet Computer'
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
		networkName: 'Internet Computer'
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
		networkName: 'Ethereum'
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
		networkName: 'Ethereum'
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
		networkName: 'Sepolia'
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
		networkName: 'Sepolia'
	});
	await expect(
		homepageLoggedIn.getTokenCardLocator({
			tokenSymbol: 'USDC',
			networkSymbol: 'SepoliaETH'
		})
	).not.toBeVisible();
});
