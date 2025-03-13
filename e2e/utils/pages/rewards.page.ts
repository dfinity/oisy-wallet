import {
  CAROUSEL_SLIDE_NAVIGATION,
  NAVIGATION_ITEM_AIRDROPS,
  REWARDS_MODAL_DATE_BADGE,
  REWARDS_STATUS_BUTTON,
  SETTINGS_ADDRESS_LABEL
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type RewardsPageParams = HomepageLoggedInParams;

export class RewardsPage extends HomepageLoggedIn {
  constructor({ page, iiPage, viewportSize }: RewardsPageParams) {
    super({ page, iiPage, viewportSize });
  }

  override async extendWaitForReady(): Promise<void> {
    await this.navigateTo(NAVIGATION_ITEM_AIRDROPS);
    await this.clickByTestId({ testId: REWARDS_STATUS_BUTTON })
    await this.mockSelector({ selector: `[data-tid="${REWARDS_MODAL_DATE_BADGE}"]` });
    await this.waitForLoadState();
  }
}
