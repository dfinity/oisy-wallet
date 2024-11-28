import { type Page } from '@playwright/test';

export async function disableCarouselAutoplay(page: Page) {
	await page.addInitScript(() => {
		(window.setInterval as any) = (
			handler: TimerHandler,
			timeout?: number,
			...args: any[]
		): number => {
			console.warn('setInterval has been disabled to prevent carousel autoplay.');
			return 0;
		};
	});
}
