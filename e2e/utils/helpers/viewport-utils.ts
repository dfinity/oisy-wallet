import { NAVIGATION_FOOTER, SIDEBAR_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
import type { Page } from '@playwright/test';

export class ViewportAdjuster {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}
	
	private async waitForLoadState(): Promise<void> {
		await this.#page.waitForLoadState('load');
	}

	/**
	 * Returns the stable viewport height by waiting until the document's scrollHeight stops changing.
	 */
	private async getStableViewportHeight(): Promise<number> {
		let previousHeight: number;
		let currentHeight: number = await this.#page.evaluate(
			() => document.documentElement.scrollHeight
		);

		do {
			previousHeight = currentHeight;
			await this.#page.waitForTimeout(1000);
			currentHeight = await this.#page.evaluate(
				() => document.documentElement.scrollHeight
			);
		} while (currentHeight !== previousHeight);

		return currentHeight;
	}

	/**
	 * Adjusts the viewport height until the sidebar navigation and footer no longer overlap.
	 * It calculates the overlap amount and increases the height accordingly.
	 */
	public async adjustViewportUntilNoOverlap(): Promise<void> {
		await this.waitForLoadState();

		const currentViewport = this.#page.viewportSize();
		const width =
			currentViewport?.width ??
			(await this.#page.evaluate(() => window.innerWidth));

		let baseHeight = await this.getStableViewportHeight();
		let adjustedHeight = baseHeight;
		let iteration = 0;
		const maxIterations = 10;

		while (iteration < maxIterations) {
			await this.#page.setViewportSize({ width, height: adjustedHeight });
			await this.#page.waitForTimeout(500);

			const overlapAmount = await this.#page.evaluate(
				([NAVIGATION_FOOTER, SIDEBAR_NAVIGATION_MENU]) => {
					const footer = document.querySelector(`[data-tid="${NAVIGATION_FOOTER}"]`);
					const menu = document.querySelector(`[data-tid="${SIDEBAR_NAVIGATION_MENU}"]`);
					if (footer && menu) {
						const footerBox = footer.getBoundingClientRect();
						const menuBox = menu.getBoundingClientRect();
						return Math.max(0, menuBox.bottom - footerBox.top);
					}
					return 0;
				},
				[NAVIGATION_FOOTER, SIDEBAR_NAVIGATION_MENU]
			);

			if (overlapAmount > 0) {
				adjustedHeight += overlapAmount;
			} else {
				break;
			}
			iteration++;
		}

		if (iteration === maxIterations) {
			console.warn('Max iterations reached. Overlap may still exist.');
		}
	}
}