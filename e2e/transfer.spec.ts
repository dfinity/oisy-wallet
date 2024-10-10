import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
	await page.goto('http://localhost:5173/');
	const page1Promise = page.waitForEvent('popup');
	await page.click('[data-tid="login-button"]');
	await page.getByRole('button', { name: 'Open or Create' }).nth(1).click();
	const internetIdentityPage = await page.waitForEvent('popup');
	await internetIdentityPage.getByRole('button', { name: 'Create Internet Identity' }).click();
	await internetIdentityPage.getByRole('button', { name: 'Create Passkey' }).click();
	await internetIdentityPage.getByLabel('Type the characters you see').fill('a');
	await internetIdentityPage.getByRole('button', { name: 'Next' }).click();
	await internetIdentityPage.getByRole('button', { name: 'I saved it, continue' }).click();
	await page.getByRole('banner').getByLabel('Your wallet address, settings').click();
	await page.getByRole('button', { name: 'Logout' }).click();
	await expect(page.getByAltText('Preview of Oisy Wallet once')).toBeVisible();
	await expect(page.getByRole('button', { name: 'What I can do with my tokens' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'How Oisy Wallet works' })).toBeVisible();

	// /transactions/?token=Internet Computer&network=ICP
	// http://localhost:5173/transactions/?token=Internet%20Computer&network=ICP
	// receive-tokens-modal-open-button

});