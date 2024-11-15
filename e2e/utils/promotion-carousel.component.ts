import { Locator, Page } from '@playwright/test';

export class PromotionCarousel {
	private page: Page;
	private carouselContainer: Locator;
	private slideButtonSelector: string;
	private activeSlideSelector: string;

	constructor(page: Page) {
		this.page = page;
		this.carouselContainer = this.page.getByTestId('carousel-container');
		// Selector template for the slide navigation buttons
		this.slideButtonSelector = 'button[aria-label="Jump to slide {slideNumber}"]';
		// Selector template for the active slide
		this.activeSlideSelector = '.carousel-slide.active[data-slide="{slideNumber}"]';
	}

	/**
	 * Navigate to a specific slide in the carousel.
	 * @param slideNumber - The slide number to navigate to.
	 */
	async goToSlide(slideNumber: number): Promise<void> {
		// Construct the selector for the slide button
		const slideButton = this.slideButtonSelector.replace('{slideNumber}', slideNumber.toString());

		// Wait for the carousel container to be visible
		await this.carouselContainer.waitFor({ state: 'visible', timeout: 10000 });

		// Click the button to navigate to the desired slide
		await this.page.click(slideButton);

		// Ensure the carousel is on the correct slide
		const activeSlide = this.activeSlideSelector.replace('{slideNumber}', slideNumber.toString());
		await this.page.waitForSelector(activeSlide, { timeout: 5000 });
	}
}
