import { test, expect } from '@playwright/test';

test.describe('Basic Test', () => {
	test('should load the homepage', async ({ page }) => {
		await page.goto('http://localhost:4173');
		await expect(page).toHaveTitle(/Oisy/);
	});
});