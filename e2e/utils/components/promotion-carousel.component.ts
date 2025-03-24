import { CAROUSEL_CONTAINER } from '$lib/constants/test-ids.constants';
import type { Page } from '@playwright/test';

export class PromotionCarousel {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	public async freezeCarouselToSlide(): Promise<void> {
		// TODO: the carousel is too flaky for the E2E tests, so we need completely hide it and work on freezing it in a permanent state in another PR.

		const selector = `[data-tid="${CAROUSEL_CONTAINER}"]:visible`;
		const isVisible = await this.#page.isVisible(selector);
		if (!isVisible) {
			await this.#page.locator(selector).evaluate((element) => (element.style.display = 'none'));
		}

		// const navigationSelector1 = `[data-tid="${CAROUSEL_SLIDE_NAVIGATION}${slideNumber}"]:visible`;
		// await this.#page.click(navigationSelector1);
		// await this.#page.evaluate(() => {
		// 	const slide = document.querySelector(`div[data-tid="carousel-slide"]`);
		// 	if (slide) {
		// 		slide.setAttribute(
		// 			'style',
		// 			// 'width: 1584px; ' +
		// 			'transform: translate3d(-264px, 0px, 0px) !important; ' +
		// 				'transition: none !important; ' +
		// 				'animation: none !important;'
		// 		);
		// 	}
		// });
	}
}
