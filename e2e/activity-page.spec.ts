import { testWithII } from '@dfinity/internet-identity-playwright';
import { ActivityPage } from './utils/pages/activity.page';

testWithII('should display activity page', async ({ page, iiPage }) => {
	const activityPage = new ActivityPage({ page, iiPage });

	await activityPage.waitForReady();

	await activityPage.takeScreenshot();
});
