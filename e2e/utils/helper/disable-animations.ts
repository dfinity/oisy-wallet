import type { Page } from '@playwright/test';

export class DisableAnimations {
	#page: Page;

	constructor(page: Page) {
		this.#page = page;
	}

	public async disableAnimationsAndFocusStyles(): Promise<void> {
		await this.#page.evaluate(() => {
			const activeElement = document.activeElement as HTMLElement;
			if (activeElement) {
				activeElement.blur();
			}
		});

		await this.#page.addStyleTag({
			content: `
        *:focus,
        *:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }
      `
		});
	}
}
