import { testWithII } from '@dfinity/internet-identity-playwright';
import { TestnetCases, TestnetsPage } from './utils/pages/testnets.page';

TestnetCases.forEach(({ name, networkSymbol, tokenSymbol }) => {
	testWithII(name, async ({ page, iiPage }) => {
		const testnetsPage = new TestnetsPage({ page, iiPage });
		await testnetsPage.waitForReady();
		await testnetsPage.enableTestnets({ networkSymbol, tokenSymbol });
		await testnetsPage.takeScreenshot();
	});
});
