import { type Page } from '@playwright/test';

export async function disableCarouselAutoplay(page: Page) {
	await page.addInitScript(() => {
		const originalSetInterval = setInterval
    // eslint-disable-line local-rules/prefer-object-params
		const mockSetInterval = (handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
        console.log(`Received call for setTimeout with handler: ${handler}, timeout: ${timeout}, args: ${args}`)
				console.log('setInterval has been disabled to prevent carousel autoplay.');
				return 0;
		};

		mockSetInterval.__promisify__ = originalSetInterval.__promisify__;
		
		window.setInterval = mockSetInterval as typeof setInterval;
	});
}
