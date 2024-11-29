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
		};

  public async freezeCarousel(): Promise<void> {
    await this.#page.$$eval(`div[data-tid="carousel-slide"]`, elements => {
      elements.forEach(el => {
				const slideStyle = el.style.transform
				el.style.transform = slideStyle
			})
    });

    await this.#page.$$eval(`[data-tid^="carousel-slide-navigation-"]`, elements => {
    	elements.forEach(el => {
				const indicatorWidth = el.style.width
				const indicatorBackgroundColor = el.style.backgroundColor
        el.style.width = indicatorWidth;
        el.style.backgroundColor = indicatorBackgroundColor;
      });
    });
  }
}
