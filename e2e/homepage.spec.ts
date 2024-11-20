import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test } from '@playwright/test';
import { HomepageLoggedIn, HomepageLoggedOut } from './utils/pages/homepage.page';

test('should display homepage in logged out state', async ({ page }) => {
	const homepageLoggedOut = new HomepageLoggedOut({ page });

	await homepageLoggedOut.waitForReady();

	await page.waitForLoadState('networkidle');

	await expect(page).toHaveScreenshot({
		fullPage: true,
		animations: 'disabled'
	});
});

testWithII('should display homepage in logged in state', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForReady();

	await page.waitForLoadState('networkidle');

	const numberOfSlides = await homepageLoggedIn.getNumberOfSlides();

	for (let i = 1; i <= numberOfSlides; i++) {
		await homepageLoggedIn.navigateToSlide(i);
	}

	await expect(page).toHaveScreenshot({
		fullPage: true,
		animations: 'disabled'
	});
});
