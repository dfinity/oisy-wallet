import { testWithII } from '@dfinity/internet-identity-playwright';
import { test } from '@playwright/test';
import { ActivityPage } from './utils/pages/activity.page';

test.describe('Activity Page', () => {
	testWithII('should display activity page', async ({ page, iiPage, isMobile }) => {
		const activityPage = new ActivityPage({ page, iiPage, isMobile });

		await activityPage.waitForReady();

		await activityPage.takeScreenshot();
	});
});
