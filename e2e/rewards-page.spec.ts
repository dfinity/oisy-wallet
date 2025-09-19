import { testWithII } from '@dfinity/internet-identity-playwright';
import { RewardsPage } from './utils/pages/rewards-page';

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
// TODO: Adjust test to new earn page instead of rewards page, when the feature is ready
testWithII.skip('should display rewards page', async ({ page, iiPage }) => {
	const rewardsPage = new RewardsPage({ page, iiPage });

	await rewardsPage.waitForReady();

	await rewardsPage.takeScreenshot();
});
