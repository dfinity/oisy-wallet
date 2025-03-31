import {
    SWAP_TOKENS_MODAL,
    SWAP_TOKENS_MODAL_OPEN_BUTTON
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { RewardsPage } from './utils/pages/rewards-page';

const SWAP_MODAL_VIEWPORT_HEIGHT = 900;

testWithII('should display swap modal', async ({ page, iiPage, isMobile }) => {
    const rewardsPage = new RewardsPage({
        page,
        iiPage,
        viewportSize: !isMobile
            ? {
                    width: MODALS_VIEWPORT_WIDTH,
                    height: SWAP_MODAL_VIEWPORT_HEIGHT
                }
            : undefined
    });

    await rewardsPage.waitForReady();

    await rewardsPage.testModalSnapshot({
        modalOpenButtonTestId: SWAP_TOKENS_MODAL_OPEN_BUTTON,
        modalTestId: SWAP_TOKENS_MODAL
    });
});
