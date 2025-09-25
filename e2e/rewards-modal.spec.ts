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

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
// TODO: improve the test to mock the campaign in case there is none
testWithII.skip('should display rewards modal', async ({ page, iiPage, isMobile }) => {
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
