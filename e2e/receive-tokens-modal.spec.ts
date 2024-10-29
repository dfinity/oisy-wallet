import {
	RECEIVE_TOKENS_MODAL,
	RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
	RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION,
	RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
	RECEIVE_TOKENS_MODAL_ETH_SECTION,
	RECEIVE_TOKENS_MODAL_ICP_SECTION,
	RECEIVE_TOKENS_MODAL_ICRC_SECTION,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';
import { getReceiveTokensModalAddressLabelSelectors } from './utils/selectors.utils';

const RECEIVE_TOKENS_MODAL_VIEWPORT_HEIGHT = 900;
let homepageLoggedIn: HomepageLoggedIn;

testWithII.beforeEach(async ({ page, iiPage, isMobile }) => {
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
			RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION
		])
	});
});

testWithII('should display correct QR codes for receiving ICP tokens', async () => {
	await homepageLoggedIn.testReceiveModalQrCode({
		receiveModalSectionSelector: RECEIVE_TOKENS_MODAL_ICP_SECTION
	});
});

testWithII('should display correct QR codes for receiving ICRC tokens', async () => {
	await homepageLoggedIn.testReceiveModalQrCode({
		receiveModalSectionSelector: RECEIVE_TOKENS_MODAL_ICRC_SECTION
	});
});

testWithII('should display correct QR codes for receiving ETH tokens', async () => {
	await homepageLoggedIn.testReceiveModalQrCode({
		receiveModalSectionSelector: RECEIVE_TOKENS_MODAL_ETH_SECTION
	});
});
