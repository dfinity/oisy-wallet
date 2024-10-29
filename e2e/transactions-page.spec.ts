import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { TransactionsPage } from './utils/pages/transactions.page';

testWithII('should display ICP transactions page', async ({ page, iiPage }) => {
	const transactionsPage = new TransactionsPage({ page, iiPage, tokenSymbol: 'ICP' });

	await transactionsPage.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});
