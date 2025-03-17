import { CAROUSEL_SLIDE_NAVIGATION } from '$lib/constants/test-ids.constants';
import type { Page } from '@playwright/test';

export class PromotionCarousel {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	public async freezeCarouselToSlide(slideNumber: number): Promise<void> {
		const navigationSelector1 = `[data-tid="${CAROUSEL_SLIDE_NAVIGATION}${slideNumber}"]:visible`;
		await this.#page.click(navigationSelector1);
		await this.#page.evaluate(() => {
			const slide = document.querySelector(`div[data-tid="carousel-slide"]`);
			if (slide) {
				slide.setAttribute(
					'style',
					'width: 1584px; ' +
						'transform: translate3d(-264px, 0px, 0px) !important; ' +
						'transition: none !important; ' +
						'animation: none !important;'
				);
			}
		});
	}
}
