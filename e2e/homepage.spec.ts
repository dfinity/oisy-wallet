import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect, test, type Page } from '@playwright/test';

const testUrl = '/';

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
	testWithII.beforeEach(async ({ page, iiPage, context }) => {
		const url = 'http://127.0.0.1:4943';
		const canisterId = 'bkyz2-fmaaa-aaaaa-qaaaq-cai';
		const timeout = 180000;
		await iiPage.waitReady({ url, canisterId, timeout });

		await page.goto(testUrl);

		// test if adding timeout solves the issue
		const iiPageCustomPromise = context.waitForEvent('page', { timeout });
		await page.getByTestId('login-button').click();

		const iiPageCustom = await iiPageCustomPromise;
		await expect(iiPageCustom).toHaveTitle('Internet Identity', { timeout });

		await iiPageCustom.locator('#registerButton').click({ timeout });
		await iiPageCustom.locator('[data-action=construct-identity]').click({ timeout });

		await iiPageCustom.locator('input#captchaInput').fill('a');
		await iiPageCustom.locator('#confirmRegisterButton').click({ timeout });

		const identity = await iiPageCustom.locator('#userNumber').textContent({ timeout });
		expect(identity).not.toBeNull();

		await iiPageCustom.locator('#displayUserContinue').click();
		await iiPageCustom.waitForEvent('close', { timeout });
		expect(iiPageCustom.isClosed()).toBe(true);

		// await iiPage.signInWithNewIdentity();

		await page.getByTestId('exchange-balance-output').waitFor({ timeout });
		await page.getByTestId('tokens-skeletons-initialized').waitFor({ timeout });
	});

	testWithII('should display logged in hero and tokens', async ({ page }) => {
		await hideHeroAnimation(page);

		await expect(page).toHaveScreenshot({
			fullPage: true
		});
	});
});
