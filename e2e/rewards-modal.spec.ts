import {
	REWARDS_MODAL,
	REWARDS_MODAL_DATE_BADGE,
	REWARDS_STATUS_BUTTON
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { RewardsPage } from './utils/pages/rewards-page';
import { getReceiveTokensModalAddressLabelSelectors } from './utils/selectors.utils';

const REWARDS_MODAL_VIEWPORT_HEIGHT = 900;
let rewardsPage: RewardsPage;

testWithII.beforeEach(async ({ page, iiPage, isMobile }) => {
	rewardsPage = new RewardsPage({
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
});

testWithII('should display rewards modal', async () => {
	await rewardsPage.testModalSnapshot({
		modalOpenButtonTestId: REWARDS_STATUS_BUTTON,
		modalTestId: REWARDS_MODAL,
		selectorsToMock: getReceiveTokensModalAddressLabelSelectors([REWARDS_MODAL_DATE_BADGE])
	});
});
