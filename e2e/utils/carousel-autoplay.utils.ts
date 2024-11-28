import { type Page } from '@playwright/test';

export async function disableCarouselAutoplay(page: Page) {
	await page.addInitScript(() => {
		const originalSetInterval = setInterval;
		const mockSetInterval = (
			handler: TimerHandler,
			timeout?: number,
			...args: unknown[]
		): number => {
			console.warn('setInterval has been disabled to prevent carousel autoplay.');
			return 0;
		};

		mockSetInterval.__promisify__ = originalSetInterval.__promisify__;

		window.setInterval = mockSetInterval as typeof setInterval;
	});
}
