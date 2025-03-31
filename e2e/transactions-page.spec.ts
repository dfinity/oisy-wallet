import { testWithII } from '@dfinity/internet-identity-playwright';
import { TransactionCases, TransactionsPage } from './utils/pages/transactions.page';

TransactionCases.forEach(({ tokenSymbol, networkId }) => {
	testWithII(`should display ${tokenSymbol} transactions page`, async ({ page, iiPage }) => {
		const transactionsPage = new TransactionsPage({
			page,
			iiPage
		});
		await transactionsPage.waitForReady();
		await transactionsPage.showTransactions({ tokenSymbol, networkId });
	});
});
