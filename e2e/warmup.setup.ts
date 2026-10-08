import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
import { test as setup } from '@playwright/test';

// In dev mode (`npm run dev`) Vite triggers a dependency-optimization reload
// on the very first navigation; if the first real test happens to land
// during that reload the Internet Identity popup connection breaks and login
// fails. Pre-warm by loading the home page once and waiting for the
// post-reload login button to render before any actual test runs.
//
// Allow up to 60 s for the post-reload render — the actual wait is typically
// a few seconds, but the cap protects against a Vite optimization that
// genuinely hangs.
const WARMUP_TIMEOUT = 60_000;

setup('warm up the app to trigger initial reload', async ({ page }) => {
	setup.setTimeout(WARMUP_TIMEOUT + 30_000);

	await page.goto('/');
	await page.getByTestId(LOGIN_BUTTON).waitFor({ state: 'visible', timeout: WARMUP_TIMEOUT });
});
