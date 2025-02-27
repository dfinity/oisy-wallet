import { type Page } from '@playwright/test';

export const disableAnimationsAndFocusStyles = async ({ page }: { page: Page }): Promise<void> => {
	await page.addStyleTag({
		content: `
      *:focus {
        outline: none !important;
      }
      *,
      *::before,
      *::after {
        -moz-animation: none !important;
        -moz-transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
        transition: none !important;
      }
    `
	});
};
