import { expect, test } from '@playwright/test';
import {
	ABOUT_HOW_MODAL_VIEWPORT_HEIGHT,
	ABOUT_MODALS_VIEWPORT_WIDTH
} from './utils/constants/e2e.constants';
import { HomepageLoggedOut } from './utils/pages/homepage.page';

test('should display about-how modal', async ({ page }) => {
	const homepageLoggedOut = new HomepageLoggedOut({ page });

	// make sure we capture the whole modal content by setting specific viewport size
	await homepageLoggedOut.setViewportSize({
		width: ABOUT_MODALS_VIEWPORT_WIDTH,
		height: ABOUT_HOW_MODAL_VIEWPORT_HEIGHT
	});
	await homepageLoggedOut.waitForReady();

	const aboutHowModal = await homepageLoggedOut.waitForAboutHowModal();

	await expect(aboutHowModal).toHaveScreenshot();
});
