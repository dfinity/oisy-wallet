import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { TransactionsPage } from './utils/pages/transactions.page';

testWithII('should display BTC transactions page', async ({ page, iiPage }) => {
	const transactionsPage = new TransactionsPage({
		page,
		iiPage,
		tokenSymbol: 'BTC',
		networkId: BTC_MAINNET_TOKEN.network.id
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
// 		networkId: ETHEREUM_TOKEN.network.id
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
		networkId: ICP_TOKEN.network.id
	});

	await transactionsPage.waitForReady();

	await transactionsPage.takeScreenshot();
});
