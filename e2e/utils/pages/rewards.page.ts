import {
	NAVIGATION_ITEM_REWARDS,
	REWARDS_DATE_BADGE,
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type RewardsPageParams = HomepageLoggedInParams;

export class RewardsPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: RewardsPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_REWARDS);
		await this.mockSelector({ selector: `[data-tid="${REWARDS_DATE_BADGE}"]` });
		await this.waitForLoadState();
	}
}
