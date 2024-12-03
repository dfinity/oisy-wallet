import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { TransactionsPage } from './utils/pages/transactions.page';

testWithII('should display BTC transactions page', async ({ page, iiPage }) => {
	const transactionsPage = new TransactionsPage({ page, iiPage, tokenSymbol: 'BTC' });

	await transactionsPage.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});

// TODO: resolve the below test flakiness
testWithII('should display ETH transactions page', async ({ page, iiPage }) => {
	const transactionsPage = new TransactionsPage({ page, iiPage, tokenSymbol: 'ETH' });

	await transactionsPage.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});

testWithII('should display ICP transactions page', async ({ page, iiPage }) => {
	const transactionsPage = new TransactionsPage({ page, iiPage, tokenSymbol: 'ICP' });

	await transactionsPage.waitForReady();

	await expect(page).toHaveScreenshot({ fullPage: true });
});
