import { testWithII } from '@dfinity/internet-identity-playwright';
import { TestnetsPage } from './utils/pages/testnets.page';

testWithII('enable BTC (Testnet)', async ({ page, iiPage }) => {
	const testnetsPage = new TestnetsPage({ page, iiPage });

	await testnetsPage.waitForReady();
	await testnetsPage.enableTestnets({
		networkSymbol: 'BTC (Testnet)',
		tokenSymbol: 'BTC (Testnet)'
	});
	await testnetsPage.takeScreenshot();
});

testWithII('enable BTC (Regtest)', async ({ page, iiPage }) => {
	const testnetsPage = new TestnetsPage({ page, iiPage });

	await testnetsPage.waitForReady();
	await testnetsPage.enableTestnets({
		networkSymbol: 'BTC (Regtest)',
		tokenSymbol: 'BTC (Regtest)'
	});
	await testnetsPage.takeScreenshot();
});

testWithII('enable SepoliaETH', async ({ page, iiPage }) => {
	const testnetsPage = new TestnetsPage({ page, iiPage });

	await testnetsPage.waitForReady();
	await testnetsPage.enableTestnets({
		networkSymbol: 'SepoliaETH',
		tokenSymbol: 'SepoliaETH'
	});
	await testnetsPage.takeScreenshot();
});

testWithII('enable SOL (Testnet)', async ({ page, iiPage }) => {
	const testnetsPage = new TestnetsPage({ page, iiPage });

	await testnetsPage.waitForReady();
	await testnetsPage.enableTestnets({
		networkSymbol: 'SOL (Testnet)',
		tokenSymbol: 'SOL (Testnet)'
	});
	await testnetsPage.takeScreenshot();
});

testWithII('enable SOL (Devnet)', async ({ page, iiPage }) => {
	const testnetsPage = new TestnetsPage({ page, iiPage });

	await testnetsPage.waitForReady();
	await testnetsPage.enableTestnets({
		networkSymbol: 'SOL (Devnet)',
		tokenSymbol: 'SOL (Devnet)'
	});
	await testnetsPage.takeScreenshot();
});

testWithII('enable SOL (Local)', async ({ page, iiPage }) => {
	const testnetsPage = new TestnetsPage({ page, iiPage });

	await testnetsPage.waitForReady();
	await testnetsPage.enableTestnets({
		networkSymbol: 'SOL (Local)',
		tokenSymbol: 'SOL (Local)'
	});
	await testnetsPage.takeScreenshot();
});
