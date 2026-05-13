import { test as setup } from '@playwright/test';

const WARMUP_TIMEOUT = 15_000;

setup('warm up the app to trigger initial reload', async ({ page }) => {
	setup.setTimeout(WARMUP_TIMEOUT + 30_000);

	await page.goto('/');
	await page.waitForTimeout(WARMUP_TIMEOUT);
});
