import {
  NAVIGATION_ITEM_REWARDS,
  REWARDS_MODAL,
  REWARDS_MODAL_DATE_BADGE,
  REWARDS_STATUS_BUTTON
} from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';
import { getReceiveTokensModalAddressLabelSelectors } from './utils/selectors.utils';

const RECEIVE_TOKENS_MODAL_VIEWPORT_HEIGHT = 900;
let homepageLoggedIn: HomepageLoggedIn;

testWithII.beforeEach(async ({ page, iiPage, isMobile }) => {
  await page.clock.install();

  homepageLoggedIn = new HomepageLoggedIn({
    page,
    iiPage,
    viewportSize: !isMobile
      ? {
          width: MODALS_VIEWPORT_WIDTH,
          height: RECEIVE_TOKENS_MODAL_VIEWPORT_HEIGHT
        }
      : undefined
  });
  await homepageLoggedIn.waitForReady();
  await homepageLoggedIn.navigateTo(NAVIGATION_ITEM_REWARDS);
});

testWithII('should display rewards modal', async () => {
  await homepageLoggedIn.testModalSnapshot({
    modalOpenButtonTestId: REWARDS_STATUS_BUTTON,
    modalTestId: REWARDS_MODAL,
    selectorsToMock: getReceiveTokensModalAddressLabelSelectors([
      REWARDS_MODAL_DATE_BADGE
    ])
  });
});