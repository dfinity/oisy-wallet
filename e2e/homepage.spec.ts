import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test, type Page } from '@playwright/test';

const testUrl = '/';
const timeout = 120000;

const hideHeroAnimation = async (page: Page): Promise<void> => {
	await page
		.getByTestId('three-background-canvas')
		.evaluate((element) => (element.style.display = 'none'));
};

test.describe('logged out user', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(testUrl);

		await page.getByTestId('login-button').waitFor();
	});

	test('should display logged out hero and blurred tokens', async ({ page }) => {
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
		await iiPage.waitReady({ url, canisterId, timeout });

		await page.goto(testUrl);

		await iiPage.signInWithNewIdentity();
	});

	testWithII('should display logged in hero and tokens', async ({ page }) => {
		await page.getByTestId('tokens-skeletons-initialized').waitFor({ timeout });

		await hideHeroAnimation(page);

		await expect(page).toHaveScreenshot({
			fullPage: true
		});
	});
});
