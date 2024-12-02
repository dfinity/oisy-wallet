import type { Page } from '@playwright/test';

export class PromotionCarousel {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	public async navigateToSlide(slideNumber: number): Promise<void> {
		const navigation1Selector = `[data-tid="carousel-slide-navigation-${slideNumber}"]:visible`;
		await this.#page.click(navigation1Selector);
	}
	public async freezeCarousel(): Promise<void> {
		await this.#page.$$eval(`div[data-tid="carousel-slide"]:visible`, (elements) => {
			elements.forEach((el) => {
				const slideStyle = el.style.transform;
				el.style.transform = slideStyle;
			});
		});

		await this.#page.$$eval(`[data-tid^="carousel-slide-navigation-"]:visible`, (elements) => {
			elements.forEach((el) => {
				const indicatorWidth = el.style.width;
				const indicatorBackgroundColor = el.style.backgroundColor;
				el.style.width = indicatorWidth;
				el.style.backgroundColor = indicatorBackgroundColor;
			});
		});
	}
}
