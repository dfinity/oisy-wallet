import {
	REWARDS_MODAL,
	REWARDS_MODAL_DATE_BADGE,
	REWARDS_STATUS_BUTTON
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { RewardsPage } from './utils/pages/rewards-page';
import { getNestedSelector } from './utils/selectors.utils';

const REWARDS_MODAL_VIEWPORT_HEIGHT = 900;

testWithII('should display rewards modal', async ({ page, iiPage, isMobile }) => {
	const rewardsPage = new RewardsPage({
		page,
		iiPage,
		viewportSize: !isMobile
			? {
					width: MODALS_VIEWPORT_WIDTH,
					height: REWARDS_MODAL_VIEWPORT_HEIGHT
				}
			: undefined
	});

	await rewardsPage.waitForReady();

	await rewardsPage.testModalSnapshot({
		modalOpenButtonTestId: REWARDS_STATUS_BUTTON,
		modalTestId: REWARDS_MODAL,
		selectorsToMock: [
			getNestedSelector({
				parentSelector: REWARDS_MODAL,
				innerSelector: REWARDS_MODAL_DATE_BADGE
			})
		]
	});
});
