import { Page } from '@playwright/test';

export async function disableCarouselAutoplay(page: Page) {
	await page.addInitScript(() => {
		window.setInterval = () => {
			return null;
		};
	});
}
