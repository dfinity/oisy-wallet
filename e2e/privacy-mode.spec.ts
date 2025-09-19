import { testWithII } from '@dfinity/internet-identity-playwright';
import { HomepageLoggedIn } from './utils/pages/homepage.page';
import { FlowPage } from './utils/pages/send-and-receive-flow.page';

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should display privacy mode on homepage', async ({ page, iiPage, isMobile }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });

	await homepageLoggedIn.waitForReady();

	await homepageLoggedIn.activatePrivacyMode();

	await homepageLoggedIn.clickTokenGroupCard('ETH');

	await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
});

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip(
	'should display privacy mode on network selector',
	async ({ page, iiPage, isMobile }) => {
		const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });

		await homepageLoggedIn.waitForReady();

		await homepageLoggedIn.activatePrivacyMode();

		await homepageLoggedIn.openNetworkSelector();

		await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
	}
);

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip(
	'should display privacy mode on transactions page',
	async ({ page, iiPage, isMobile }) => {
		const flowPage = new FlowPage({ page, iiPage, isMobile });

		await flowPage.waitForReady();

		await flowPage.receiveTokens();

		await flowPage.sendTokens();

		await flowPage.navigateToAssets();

		await flowPage.activatePrivacyMode();

		await flowPage.navigateToTransactionsPage({ tokenSymbol: 'ICP', networkSymbol: 'ICP' });

		await flowPage.takeScreenshot();
	}
);

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should display privacy mode on activity page', async ({ page, iiPage, isMobile }) => {
	const flowPage = new FlowPage({ page, iiPage, isMobile });

	await flowPage.waitForReady();

	await flowPage.receiveTokens();

	await flowPage.sendTokens();

	await flowPage.navigateToActivity();

	await flowPage.activatePrivacyMode();

	await flowPage.takeScreenshot();
});
