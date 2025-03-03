import type { Page } from '@playwright/test';

export class DisableAnimations {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	public async disableHoverEffects(): Promise<void> {
		await this.#page.mouse.move(0, 0);
		await this.#page.evaluate(() => {
			(document.activeElement as HTMLElement)?.blur();
		});

		await this.#page.addStyleTag({
			content: `
				/* Forcefully remove the border on .dropdown-button in all relevant states */
				.dropdown-button:not(.loading),
				.dropdown-button:not(.loading):hover:not([disabled]),
				.dropdown-button:not(.loading):focus:not([disabled]),
				.dropdown-button:not(.loading):hover:not([disabled]) .dropdown-button,
				.dropdown-button:not(.loading):focus:not([disabled]) .dropdown-button {
					border: none !important;
					outline: none !important;
					box-shadow: none !important;
				}
			`
		});
		await this.#page.waitForTimeout(100);
	}
}
