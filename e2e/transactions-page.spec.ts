import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { TransactionCases, TransactionsPage } from './utils/pages/transactions.page';

test.describe('Transactions Page', () => {
	TransactionCases.forEach(({ tokenSymbol, networkId, ...rest }) => {
		testWithII(
			`should display ${tokenSymbol} transactions page for network ${networkId}`,
			async ({ page, iiPage }) => {
				const transactionsPage = new TransactionsPage({
					page,
					iiPage
				});
				await transactionsPage.waitForReady();
				await transactionsPage.showTransactions({ tokenSymbol, networkId, ...rest });
			}
		);
	});
});
