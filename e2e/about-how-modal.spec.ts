import { test } from '@playwright/test';
import {
	ABOUT_HOW_MODAL,
	ABOUT_HOW_MODAL_MENU_ITEM,
	ABOUT_HOW_MODAL_OPEN_BUTTON,
	ABOUT_MENU_OPEN_BUTTON,
	ABOUT_MENU_POPOVER
} from '../src/frontend/src/lib/constants/test-ids.constants';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedOut } from './utils/pages/homepage.page';

const ABOUT_HOW_MODAL_VIEWPORT_HEIGHT = 1600;

test('should display about-how modal', async ({ page, isMobile }) => {
	const homepageLoggedOut = new HomepageLoggedOut({
		page,
		viewportSize: !isMobile
			? {
					width: MODALS_VIEWPORT_WIDTH,
					height: ABOUT_HOW_MODAL_VIEWPORT_HEIGHT
				}
			: undefined
	});

	await homepageLoggedOut.waitForReady();

	await homepageLoggedOut.testModalSnapshot({
		modalOpenButtonTestId: isMobile ? ABOUT_HOW_MODAL_MENU_ITEM : ABOUT_HOW_MODAL_OPEN_BUTTON,
		modalTestId: ABOUT_HOW_MODAL,
		initializerTestId: isMobile ? ABOUT_MENU_OPEN_BUTTON : undefined,
		initializedIndicatorTestId: isMobile ? ABOUT_MENU_POPOVER : undefined
	});
});
