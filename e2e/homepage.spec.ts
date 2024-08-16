import {
	EXCHANGE_BALANCE_OUTPUT,
	LOGIN_BUTTON,
	THREE_BACKGROUND_CANVAS,
	TOKENS_SKELETONS_INITIALIZED
} from '$lib/constants/test-ids.constant';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test, type Page } from '@playwright/test';

const testUrl = '/';

const hideHeroAnimation = async (page: Page): Promise<void> => {
	await page
		.getByTestId(THREE_BACKGROUND_CANVAS)
		.evaluate((element) => (element.style.display = 'none'));
};

test.describe('logged out user', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(testUrl);
	});

	test('should display homepage in logged out state', async ({ page }) => {
		await page.getByTestId(LOGIN_BUTTON).waitFor();

		await hideHeroAnimation(page);

		await expect(page).toHaveScreenshot({
			fullPage: true
		});
	});
});

testWithII.describe('logged in user', () => {
	testWithII.beforeEach(async ({ page, iiPage }) => {
		const url = 'http://127.0.0.1:4943';
		const canisterId = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
		await iiPage.waitReady({ url, canisterId });

		await page.goto(testUrl);

		await iiPage.signInWithNewIdentity();
	});

	testWithII('should display homepage in logged in state', async ({ page }) => {
		await page.getByTestId(TOKENS_SKELETONS_INITIALIZED).waitFor();
		await page.getByTestId(EXCHANGE_BALANCE_OUTPUT).waitFor();

		await hideHeroAnimation(page);

		await expect(page).toHaveScreenshot({
			fullPage: true
		});
	});
});
