import { ABOUT_WHY_OISY_BUTTON, ABOUT_WHY_OISY_MODAL } from '$lib/constants/test-ids.constants';
import { test } from '@playwright/test';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedOut } from './utils/pages/homepage.page';

const ABOUT_WHY_OISY_MODAL_VIEWPORT_HEIGHT = 1600;

test('should display about-why-oisy modal', async ({ page, isMobile }) => {
	const homepageLoggedOut = new HomepageLoggedOut({
		page,
		viewportSize: !isMobile
			? {
					width: MODALS_VIEWPORT_WIDTH,
					height: ABOUT_WHY_OISY_MODAL_VIEWPORT_HEIGHT
				}
			: undefined
	});

	await homepageLoggedOut.waitForReady();

	await homepageLoggedOut.testModalSnapshot({
		modalOpenButtonTestId: ABOUT_WHY_OISY_BUTTON,
		modalTestId: ABOUT_WHY_OISY_MODAL
	});
});
