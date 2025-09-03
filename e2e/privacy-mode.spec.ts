import type { TestFixtures } from '@playwright/test';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { HomepageLoggedIn } from './utils/pages/homepage.page';
import { FlowPage } from './utils/pages/send-and-receive-flow.page';

testWithII('should display privacy mode on homepage', async ({ page, iiPage, isMobile }: TestFixtures) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });

	await homepageLoggedIn.waitForReady();

	await homepageLoggedIn.activatePrivacyMode();

	await homepageLoggedIn.clickTokenGroupCard('ETH');

	await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
});

testWithII(
	'should display privacy mode on network selector',
	async ({ page, iiPage, isMobile }: TestFixtures) => {
		const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });

		await homepageLoggedIn.waitForReady();

		await homepageLoggedIn.activatePrivacyMode();

		await homepageLoggedIn.openNetworkSelector();

		await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
	}
);

testWithII(
	'should display privacy mode on transactions page',
	async ({ page, iiPage, isMobile }: TestFixtures) => {
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

testWithII('should display privacy mode on activity page', async ({ page, iiPage, isMobile }: TestFixtures) => {
	const flowPage = new FlowPage({ page, iiPage, isMobile });

	await flowPage.waitForReady();

	await flowPage.receiveTokens();

	await flowPage.sendTokens();

	await flowPage.navigateToActivity();

	await flowPage.activatePrivacyMode();

	await flowPage.takeScreenshot();
});
