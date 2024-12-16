import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { TRANSACTIONS_URL } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

testWithII(
	'should be redirected to home if not network is provided to access transactions',
	async ({ page, iiPage }) => {
		const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

		await homepageLoggedIn.waitForReady();

		// We go to transactions without network
		await page.goto(`${TRANSACTIONS_URL}/?token=Internet%20Computer`);

		await homepageLoggedIn.waitForReady();

		await expect(page).toHaveScreenshot({ fullPage: true });
	}
);
