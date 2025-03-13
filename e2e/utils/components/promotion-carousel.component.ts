import { CAROUSEL_SLIDE_NAVIGATION } from '$lib/constants/test-ids.constants';
import { nonNullish } from '@dfinity/utils';
import type { Page } from '@playwright/test';

export class PromotionCarousel {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	public async freezeCarouselToSlide(slideNumber: number): Promise<void> {
		const navigation1Selector = `[data-tid="${CAROUSEL_SLIDE_NAVIGATION}${slideNumber}"]:visible`;
		await this.#page.click(navigation1Selector);
		await this.#page.evaluate(() => {
			const slide = document.querySelector(`div[data-tid="carousel-slide"]`);
			if (nonNullish(slide)) {
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
