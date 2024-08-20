import { expect, test } from '@playwright/test';
import {
	ABOUT_MODALS_VIEWPORT_WIDTH,
	ABOUT_WHAT_MODAL_VIEWPORT_HEIGHT
} from './utils/constants/e2e.constants';
import { HomepageLoggedOut } from './utils/pages/homepage.page';

test('should display about-what modal', async ({ page }) => {
	const homepageLoggedOut = new HomepageLoggedOut({ page });

	// make sure we capture the whole modal content by setting specific viewport size
	await homepageLoggedOut.setViewportSize({
		width: ABOUT_MODALS_VIEWPORT_WIDTH,
		height: ABOUT_WHAT_MODAL_VIEWPORT_HEIGHT
	});
	await homepageLoggedOut.waitForReady();

	const aboutWhatModal = await homepageLoggedOut.waitForAboutWhatModal();

	await expect(aboutWhatModal).toHaveScreenshot();
});
