import {
	SWAP_TOKENS_MODAL,
	SWAP_TOKENS_MODAL_OPEN_BUTTON
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

const SWAP_TOKENS_MODAL_VIEWPORT_HEIGHT = 900;

test.describe('Swap Modal', () => {
	testWithII('should display swap-tokens modal', async ({ page, iiPage, isMobile }) => {
		const homepageLoggedIn = new HomepageLoggedIn({
			page,
			iiPage,
			viewportSize: !isMobile
				? {
						width: MODALS_VIEWPORT_WIDTH,
						height: SWAP_TOKENS_MODAL_VIEWPORT_HEIGHT
					}
				: undefined
		});
		await homepageLoggedIn.waitForReady();

		await homepageLoggedIn.testModalSnapshot({
			modalOpenButtonTestId: SWAP_TOKENS_MODAL_OPEN_BUTTON,
			modalTestId: SWAP_TOKENS_MODAL
		});
	});
});
