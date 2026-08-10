import en from '$lib/i18n/en.json' with { type: 'json' };
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH, MODAL_VIEWPORT_HEIGHT } from './utils/constants/e2e.constants';
import {
	IMPORT_TOKEN_ETHEREUM_NETWORK_NAME,
	IMPORT_TOKEN_ICP_NETWORK_NAME,
	ImportTokenPage
} from './utils/pages/import-token.page';

// II registration + post-login token init can spike past the 15 s default
// on a loaded shard.
testWithII.use({ actionTimeout: 60_000 });
testWithII.describe.configure({ timeout: 300_000, retries: 2 });

// The local ck ledgers are registered as testnet ledgers, so with testnets off
// (the default) OISY does not know them yet and they are the only ICRC
// ledger/index pair the e2e replica offers that can actually be imported.
const CKBTC_LEDGER_CANISTER_ID = process.env.E2E_LOCAL_CKBTC_LEDGER_CANISTER_ID ?? '';
const CKBTC_INDEX_CANISTER_ID = process.env.E2E_LOCAL_CKBTC_INDEX_CANISTER_ID ?? '';
const CKETH_INDEX_CANISTER_ID = process.env.E2E_LOCAL_CKETH_INDEX_CANISTER_ID ?? '';
const ICP_LEDGER_CANISTER_ID = process.env.E2E_LOCAL_ICP_LEDGER_CANISTER_ID ?? '';

// USDC on Ethereum mainnet - a token OISY ships by default.
const ERC20_EXISTING_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

let importTokenPage: ImportTokenPage;

testWithII.beforeEach(async ({ page, iiPage, isMobile }) => {
	// WebAuthn virtual authenticator is only available on desktop Chromium.
	const testInfo = testWithII.info();
	testInfo.skip(
		testInfo.project.name !== 'Google Chrome',
		'Internet Identity login is only validated on the Google Chrome project.'
	);

	await page.clock.install();

	importTokenPage = new ImportTokenPage({
		page,
		iiPage,
		isMobile,
		viewportSize: !isMobile
			? {
					width: MODALS_VIEWPORT_WIDTH,
					height: MODAL_VIEWPORT_HEIGHT
				}
			: undefined
	});

	await importTokenPage.waitForReady();
});

testWithII('should reject an ICRC token that is already available', async () => {
	await importTokenPage.openImportForm({ networkName: IMPORT_TOKEN_ICP_NETWORK_NAME });

	await importTokenPage.submitIcrcToken({ ledgerCanisterId: ICP_LEDGER_CANISTER_ID });

	await importTokenPage.expectImportRejected({
		errorMessage: en.tokens.error.already_available
	});
});

testWithII('should import an ICRC token with the ledger canister ID only', async () => {
	await importTokenPage.openImportForm({ networkName: IMPORT_TOKEN_ICP_NETWORK_NAME });

	await importTokenPage.submitIcrcToken({ ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID });

	await importTokenPage.expectImportReviewed({ ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID });
});

testWithII('should reject an ICRC token whose index canister ID is wrong', async () => {
	await importTokenPage.openImportForm({ networkName: IMPORT_TOKEN_ICP_NETWORK_NAME });

	await importTokenPage.submitIcrcToken({
		ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: CKETH_INDEX_CANISTER_ID
	});

	await importTokenPage.expectImportRejected({
		errorMessage: en.tokens.import.error.invalid_ledger_id
	});
});

testWithII('should import an ICRC token with both canister IDs', async () => {
	await importTokenPage.openImportForm({ networkName: IMPORT_TOKEN_ICP_NETWORK_NAME });

	await importTokenPage.submitIcrcToken({
		ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: CKBTC_INDEX_CANISTER_ID
	});

	await importTokenPage.expectImportReviewed({
		ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: CKBTC_INDEX_CANISTER_ID
	});
});

testWithII('should reject an ERC20 token that is already available', async () => {
	await importTokenPage.openImportForm({ networkName: IMPORT_TOKEN_ETHEREUM_NETWORK_NAME });

	await importTokenPage.submitErc20Token({
		contractAddress: ERC20_EXISTING_CONTRACT_ADDRESS
	});

	await importTokenPage.expectImportRejected({
		errorMessage: en.tokens.error.already_available
	});
});
