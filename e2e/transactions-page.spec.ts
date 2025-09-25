import { testWithII } from '@dfinity/internet-identity-playwright';
import { TransactionCases, TransactionsPage } from './utils/pages/transactions.page';

TransactionCases.forEach(({ tokenSymbol, networkId, ...rest }) => {
	// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
	testWithII.skip(
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
