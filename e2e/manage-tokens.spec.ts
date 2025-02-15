import { testWithII } from '@dfinity/internet-identity-playwright';
import { ManageTokensCases, ManageTokensPage } from './utils/pages/manage-tokens.page';

ManageTokensCases.forEach(({ type, tokenSymbol, networkSymbol }) => {
	testWithII(`should enable and disable ${type} token`, async ({ page, iiPage }) => {
		const manageTokensPage = new ManageTokensPage({ page, iiPage });
		await manageTokensPage.waitForReady();
		await manageTokensPage.enableAndDisableToken({ tokenSymbol, networkSymbol });
	});
});
