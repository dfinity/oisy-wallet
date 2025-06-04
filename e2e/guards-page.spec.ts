import { testWithII } from '@dfinity/internet-identity-playwright';
import { TRANSACTIONS_URL } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';
import { TransactionsPage } from './utils/pages/transactions.page';

testWithII.beforeEach(async ({ page }) => {
	await page.clock.install();
});

testWithII(
	'should be redirected to home if no network is provided to access transactions',
	async ({ page, iiPage }) => {
		// We load the transaction page for ICP. This way we know ICP is supported.
		const transactionsPage = new TransactionsPage({
			page,
			iiPage
		});

		await transactionsPage.waitForReady();

		// We go to transactions without network
		await page.goto(`${TRANSACTIONS_URL}?token=Internet%20Computer`);

		// We should be redirected to the home screen.
		const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

		await homepageLoggedIn.waitForContentReady();

		await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
	}
);
