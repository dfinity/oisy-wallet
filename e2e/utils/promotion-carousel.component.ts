import { CAROUSEL_CONTAINER, CAROUSEL_SLIDE_NAVIGATION } from '$lib/constants/test-ids.constants';
import { Locator, Page } from '@playwright/test';

export class PromotionCarousel {
	private page: Page;
	private carouselContainer: Locator;
	private carouselSlideNavigation: Locator;

	constructor(page: Page) {
		this.page = page;
		this.carouselContainer = this.page.locator(`[data-tid="${CAROUSEL_CONTAINER}"]:visible`);
		this.carouselSlideNavigation = this.page.locator(
			`[data-tid="${CAROUSEL_SLIDE_NAVIGATION}"]:visible`
		);
	}
}
