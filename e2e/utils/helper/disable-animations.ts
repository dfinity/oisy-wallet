import { type Page } from '@playwright/test';

export async function disableAnimationsAndFocusStyles(page: Page) {
	await page.evaluate(() => {
		const activeElement = document.activeElement as HTMLElement;
		if (activeElement) {
			activeElement.blur();
		}
	});

	await page.addStyleTag({
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
