import { CAROUSEL_CONTAINER, CAROUSEL_SLIDE_NAVIGATION } from '$lib/constants/test-ids.constants';
import type { Locator, Page } from '@playwright/test';

export class PromotionCarousel {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	public getCarouselSelector(): Locator {
		return this.#page.getByTestId(CAROUSEL_CONTAINER).filter({ visible: true });
	}

	public async freezeCarouselToSlide(slideNumber: number): Promise<void> {
		// TODO: the carousel is too flaky for the E2E tests, so we need completely mask it and work on freezing it in a permanent state in another PR.
		const navigationSelector1 = `[data-tid="${CAROUSEL_SLIDE_NAVIGATION}${slideNumber}"]:visible`;
		await this.#page.click(navigationSelector1);
		await this.#page.evaluate(() => {
			const slide = document.querySelector(`div[data-tid="carousel-slide"]`);
			if (slide) {
				slide.setAttribute(
					'style',
					// 'width: 1584px; ' +
					'transform: translate3d(-264px, 0px, 0px) !important; ' +
						'transition: none !important; ' +
						'animation: none !important;'
				);
			}
		});
	}
}
