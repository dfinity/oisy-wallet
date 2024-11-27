import { CAROUSEL_CONTAINER, CAROUSEL_SLIDE_NAVIGATION } from '../../../src/frontend/src/lib/constants/test-ids.constants';
import { Locator, Page } from '@playwright/test';

export class PromotionCarousel {
	#page: Page;
	#container: Locator;
	#slideNavigation: Locator;

	constructor(page: Page) {
		this.#page = page;
		this.#container = this.#page.locator(`[data-tid="${CAROUSEL_CONTAINER}"]:visible`);
		this.#slideNavigation = this.#page.locator(
			`[data-tid="${CAROUSEL_SLIDE_NAVIGATION}"]:visible`
		);
	}
}
