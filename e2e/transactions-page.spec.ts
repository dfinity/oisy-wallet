import { testWithII } from '@dfinity/internet-identity-playwright';
import { TransactionsPage } from './utils/pages/transactions.page';

testWithII('should display BTC transactions page', async ({ page, iiPage }) => {
	const transactionsPage = new TransactionsPage({
		page,
		iiPage,
		tokenSymbol: 'BTC',
		networkId: 'BTC'
	});

	await transactionsPage.waitForReady();

	await transactionsPage.takeScreenshot();
});

//TODO: resolve the below test flakiness
// testWithII.skip('should display ETH transactions page', async ({ page, iiPage }) => {
// 	const transactionsPage = new TransactionsPage({
// 		page,
// 		iiPage,
// 		tokenSymbol: 'ETH',
// 		networkId: 'ETH
// 	});
//
// 	await transactionsPage.waitForReady();
//
// 	await transactionsPage.takeScreenshot();
// });

testWithII('should display ICP transactions page', async ({ page, iiPage }) => {
	const transactionsPage = new TransactionsPage({
		page,
		iiPage,
		tokenSymbol: 'ICP',
		networkId: 'ICP'
	});

	await transactionsPage.waitForReady();

	await transactionsPage.takeScreenshot();
});
