import { testWithII } from '@dfinity/internet-identity-playwright';
import { RewardsPage } from './utils/pages/rewards-page';

// TODO: Adjust test to new earn page instead of rewards page, when the feature is ready
testWithII.skip('should display rewards page', async ({ page, iiPage }) => {
	const rewardsPage = new RewardsPage({ page, iiPage });

	await rewardsPage.waitForReady();

	await rewardsPage.takeScreenshot();
});
