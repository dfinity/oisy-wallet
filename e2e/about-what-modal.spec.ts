import {
	ABOUT_MENU_OPEN_BUTTON,
	ABOUT_MENU_POPOVER,
	ABOUT_WHAT_MODAL,
	ABOUT_WHAT_MODAL_OPEN_BUTTON,
	ABOUT_WHAT_MODAL_OPEN_MENU_ITEM
} from '$lib/constants/test-ids.constants';
import { test } from '@playwright/test';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedOut } from './utils/pages/homepage.page';

const ABOUT_WHAT_MODAL_VIEWPORT_HEIGHT = 930;

test('should display about-what modal', async ({ page, isMobile }) => {
	const homepageLoggedOut = new HomepageLoggedOut({
		page,
		viewportSize: !isMobile
			? {
					width: MODALS_VIEWPORT_WIDTH,
					height: ABOUT_WHAT_MODAL_VIEWPORT_HEIGHT
				}
			: undefined
	});

	await homepageLoggedOut.waitForReady();

	await homepageLoggedOut.testModalSnapshot({
		modalOpenButtonTestId: isMobile
			? ABOUT_WHAT_MODAL_OPEN_MENU_ITEM
			: ABOUT_WHAT_MODAL_OPEN_BUTTON,
		modalTestId: ABOUT_WHAT_MODAL,
		initializerTestId: isMobile ? ABOUT_MENU_OPEN_BUTTON : undefined,
		initializedIndicatorTestId: isMobile ? ABOUT_MENU_POPOVER : undefined
	});
});
