import { testWithII } from '@dfinity/internet-identity-playwright';
import { RewardsModalPage } from './utils/pages/rewards-modal.page';

testWithII('should display rewards page', async ({ page, iiPage }) => {
	const rewardsModalPage = new RewardsModalPage({ page, iiPage });

	await rewardsModalPage.waitForReady();

	await rewardsModalPage.takeScreenshot();
});