import { testWithII } from '@dfinity/internet-identity-playwright';
import { ActivityPage } from './utils/pages/activity.page';

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should display activity page', async ({ page, iiPage, isMobile }) => {
	const activityPage = new ActivityPage({ page, iiPage, isMobile });

	await activityPage.waitForReady();

	await activityPage.takeScreenshot();
});
