import { CAROUSEL_CONTAINER, CAROUSEL_SLIDE_NAVIGATION } from '$lib/constants/test-ids.constants';
import { Locator, Page } from '@playwright/test';

export class PromotionCarousel {
	#page: Page;
	#container: Locator;
	#slideNavigation: Locator;

	constructor(page: Page) {
		this.#page = page;
		this.#container = this.#page.locator(`[data-tid="${CAROUSEL_CONTAINER}"]:visible`);
		this.#slideNavigation = this.#page.locator(`[data-tid="${CAROUSEL_SLIDE_NAVIGATION}"]:visible`);
	}

	public async navigateToSlide(slideNumber: number): Promise<void> {
		const navigation1Selector = `[data-tid="carousel-slide-navigation-${slideNumber}"]`;
		await this.#page.click(navigation1Selector);
	}

	public async freezeCarousel(): Promise<void> {
		try {
			await this.#page.$$eval(`div[data-tid="carousel-slide"]`, (elements) => {
				elements.forEach((el) => {
					el.style.transform = el.style.transform;
				});
			});

			await this.#page.$$eval(`[data-tid^="carousel-slide-navigation-"]`, (elements) => {
				elements.forEach((el) => {
					el.style.width = el.style.width;
					el.style.backgroundColor = el.style.backgroundColor;
				});
			});
			console.log('Carousel animations disabled successfully using inline styles.');
		} catch (error) {
			console.error('Failed to disable carousel animations:', error);
		}
	}
}
