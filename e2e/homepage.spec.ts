import { LOGIN_BUTTON, TOKENS_SKELETONS_INITIALIZED } from '$lib/constants/test-ids.constant';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_ROOT_URL, HOMEPAGE_URL } from './shared/constants';
import { getInternetIdentityCanisterId, hideHeroAnimation } from './shared/utils';

test('should display homepage in logged out state', async ({ page }) => {
	await page.goto(HOMEPAGE_URL);
	await page.getByTestId(LOGIN_BUTTON).waitFor();

	await hideHeroAnimation(page);

	await expect(page).toHaveScreenshot({ fullPage: true });
});

testWithII('should display homepage in logged in state', async ({ page, iiPage }) => {
	await iiPage.waitReady({ url: DEFAULT_ROOT_URL, canisterId: getInternetIdentityCanisterId() });

	await page.goto(HOMEPAGE_URL);
	await iiPage.signInWithNewIdentity();
	await page.getByTestId(TOKENS_SKELETONS_INITIALIZED).waitFor();

	await hideHeroAnimation(page);

	await expect(page).toHaveScreenshot({ fullPage: true });
});
