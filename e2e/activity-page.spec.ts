import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { ActivityPage } from './utils/pages/activity.page';

testWithII('should display activity page', async ({ page, iiPage }) => {
	const activityPage = new ActivityPage({ page, iiPage });

	await activityPage.waitForReady();

	await page.waitForLoadState('networkidle');

	await expect(page).toHaveScreenshot({ 
		fullPage: true,
		animations: 'disabled',
	 });
});
