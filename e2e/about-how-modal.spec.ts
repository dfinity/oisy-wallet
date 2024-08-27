import { test } from '@playwright/test';
import {
	ABOUT_HOW_MODAL,
	ABOUT_HOW_MODAL_OPEN_BUTTON
} from '../src/frontend/src/lib/constants/test-ids.constants';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedOut } from './utils/pages/homepage.page';

const ABOUT_HOW_MODAL_VIEWPORT_HEIGHT = 1600;

test('should display about-how modal', async ({ page }) => {
	const homepageLoggedOut = new HomepageLoggedOut({ page });

	await homepageLoggedOut.testModalSnapshot({
		viewportSize: {
			width: MODALS_VIEWPORT_WIDTH,
			height: ABOUT_HOW_MODAL_VIEWPORT_HEIGHT
		},
		modalOpenButtonTestId: ABOUT_HOW_MODAL_OPEN_BUTTON,
		modalTestId: ABOUT_HOW_MODAL
	});
});
