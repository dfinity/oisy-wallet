import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test } from '@playwright/test';
import { disableCarouselAutoplay } from './utils/carousel-autoplay.utils';
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
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage});

	await disableCarouselAutoplay(page);

	await homepageLoggedIn.waitForReady();

	await page.waitForLoadState('networkidle');

	await homepageLoggedIn.promotionCarousel.navigateToSlide(1);

	await homepageLoggedIn.promotionCarousel.freezeCarousel();

	await expect(page).toHaveScreenshot({
		fullPage: true,
		animations: 'disabled'
	});
});
