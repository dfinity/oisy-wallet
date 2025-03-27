import { NAVIGATION_FOOTER, SIDEBAR_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
import type { Page } from '@playwright/test';

export class ViewportAdjuster {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	/**
	 * Checks for overlap between the footer and the navigation-menu
	 * and adjusts the viewport if necessary.
	 * @returns {Promise<void>}
	 */

	public async checkAndAdjustViewport(): Promise<void> {
		const footer = await this.#page.$(`[data-tid="${NAVIGATION_FOOTER}"]`);
		const div = await this.#page.$(`[data-tid="${SIDEBAR_NAVIGATION_MENU}"]`);

		if (footer && div) {
			const footerBox = await footer.boundingBox();
			const divBox = await div.boundingBox();

			if (footerBox && divBox) {
				const footerTop = footerBox.y;
				const footerBottom = footerBox.y + footerBox.height;
				const divTop = divBox.y;
				const divBottom = divBox.y + divBox.height;

				const isOverlapping = footerTop < divBottom && footerBottom > divTop;

				if (isOverlapping) {
					await this.#page.setViewportSize({ width: 1920, height: 1080 });
				}
			}
		}
	}
}