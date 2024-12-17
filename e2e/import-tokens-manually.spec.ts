import { MANAGE_TOKENS_BUTTON, RECEIVE_TOKENS_MODAL } from '$lib/constants/test-ids.constants';
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

testWithII('import ERC20 token manually', async () => {
	await homepageLoggedIn.testModalSnapshot({
		modalOpenButtonTestId: MANAGE_TOKENS_BUTTON,
		modalTestId: RECEIVE_TOKENS_MODAL,
		selectorsToMock: getReceiveTokensModalAddressLabelSelectors([
			// TODO: Add Testcode that imports the token manually
		])
	});
});

testWithII('import ICRC token manually', async () => {
	await homepageLoggedIn.testModalSnapshot({
		modalOpenButtonTestId: MANAGE_TOKENS_BUTTON,
		modalTestId: RECEIVE_TOKENS_MODAL,
		selectorsToMock: getReceiveTokensModalAddressLabelSelectors([
			// TODO: Add Testcode that imports the token manually
		])
	});
});
