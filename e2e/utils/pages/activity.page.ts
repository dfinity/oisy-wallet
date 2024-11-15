import type { Page } from '@playwright/test';
import { ACTIVITY_URL } from '../constants/e2e.constants';
import { PromotionCarousel } from '../promotion-carousel.component';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type ActivityPageParams = HomepageLoggedInParams;

export class ActivityPage extends HomepageLoggedIn {
	// TODO: Remove this variable, when the activity page is implemented
	readonly #page: Page;
	readonly promotionCarousel: PromotionCarousel;

	constructor({ page, iiPage, viewportSize }: ActivityPageParams) {
		super({ page, iiPage, viewportSize });

		this.#page = page;
		this.promotionCarousel = new PromotionCarousel(page);
	}

	/**
	 * @override
	 */
	// TODO: Implement this method clicking on the navigation item instead of using the URL, when the activity page is implemented
	async extendWaitForReady(): Promise<void> {
		await this.#page.goto(ACTIVITY_URL);
	}
}
