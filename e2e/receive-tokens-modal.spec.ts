import {
	RECEIVE_TOKENS_MODAL,
	RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
	RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION,
	RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
	RECEIVE_TOKENS_MODAL_ETH_SECTION,
	RECEIVE_TOKENS_MODAL_ICP_SECTION,
	RECEIVE_TOKENS_MODAL_ICRC_SECTION,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	RECEIVE_TOKENS_MODAL_SOL_DEVNET_SECTION,
	RECEIVE_TOKENS_MODAL_SOL_MAINNET_SECTION
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';
import { getReceiveTokensModalAddressLabelSelectors } from './utils/selectors.utils';

const RECEIVE_TOKENS_MODAL_VIEWPORT_HEIGHT = 900;
let homepageLoggedIn: HomepageLoggedIn;

testWithII.beforeEach(async ({ page, iiPage, isMobile }) => {
	await page.clock.install();

	homepageLoggedIn = new HomepageLoggedIn({
		page,
		iiPage,
		viewportSize: !isMobile
			? {
					width: MODALS_VIEWPORT_WIDTH,
					height: RECEIVE_TOKENS_MODAL_VIEWPORT_HEIGHT
				}
			: undefined
	});
	await homepageLoggedIn.waitForReady();
	await homepageLoggedIn.activateTestnetSettings();
});

testWithII('should display receive-tokens modal', async () => {
	await homepageLoggedIn.testModalSnapshot({
		modalOpenButtonTestId: RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
		modalTestId: RECEIVE_TOKENS_MODAL,
		selectorsToMock: getReceiveTokensModalAddressLabelSelectors([
			RECEIVE_TOKENS_MODAL_ICRC_SECTION,
			RECEIVE_TOKENS_MODAL_ICP_SECTION,
			RECEIVE_TOKENS_MODAL_ETH_SECTION,
			RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
			RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
			RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION,
			RECEIVE_TOKENS_MODAL_SOL_MAINNET_SECTION,
			RECEIVE_TOKENS_MODAL_SOL_DEVNET_SECTION
		])
	});
});

const sections = [
	{
		name: 'ICP',
		selector: RECEIVE_TOKENS_MODAL_ICP_SECTION
	},
	{
		name: 'ICRC',
		selector: RECEIVE_TOKENS_MODAL_ICRC_SECTION
	},
	{
		name: 'ETH',
		selector: RECEIVE_TOKENS_MODAL_ETH_SECTION
	},
	{
		name: 'SOL mainnet',
		selector: RECEIVE_TOKENS_MODAL_SOL_MAINNET_SECTION
	},
	{
		name: 'SOL devnet',
		selector: RECEIVE_TOKENS_MODAL_SOL_DEVNET_SECTION
	}
];

for (const { name, selector } of sections) {
	testWithII(`should display correct QR codes for receiving ${name} tokens`, async () => {
		await homepageLoggedIn.testReceiveModalQrCode({
			receiveModalSectionSelector: selector
		});
	});
}
