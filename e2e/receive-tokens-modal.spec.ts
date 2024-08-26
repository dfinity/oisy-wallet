import {
	RECEIVE_TOKENS_MODAL,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

const RECEIVE_TOKENS_MODAL_VIEWPORT_HEIGHT = 900;

testWithII('should display receive-tokens modal', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({
		page,
		iiPage,
		viewportSize: {
			width: MODALS_VIEWPORT_WIDTH,
			height: RECEIVE_TOKENS_MODAL_VIEWPORT_HEIGHT
		}
	});

	await homepageLoggedIn.waitForReady();

	await homepageLoggedIn.testModalSnapshot({
		modalOpenButtonTestId: RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
		modalTestId: RECEIVE_TOKENS_MODAL
	});
});
