import { testWithII } from '@dfinity/internet-identity-playwright';
import { RewardsPage } from './utils/pages/rewards-page';

testWithII('should display earning page', async ({ page, iiPage }) => {
	const rewardsPage = new RewardsPage({ page, iiPage });

	await rewardsPage.waitForReady();

	await rewardsPage.takeScreenshot();
});
