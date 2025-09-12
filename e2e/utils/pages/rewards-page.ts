import { AppPath } from '$lib/constants/routes.constants';
import {
	NAVIGATION_ITEM_REWARDS,
	REWARDS_ACTIVE_CAMPAIGNS_CONTAINER
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type RewardsPageParams = HomepageLoggedInParams;

export class RewardsPage extends HomepageLoggedIn {
	constructor(params: RewardsPageParams) {
		super(params);
	}

	override async extendWaitForReady(): Promise<void> {
		// Navigate using the existing nav test-id but target the new Earning route.
		await this.navigateTo({ testId: NAVIGATION_ITEM_REWARDS, expectedPath: AppPath.Earning });
		await this.mockSelector({
			selector: `[data-tid^="${REWARDS_ACTIVE_CAMPAIGNS_CONTAINER}-"][data-tid$="-badge"]`
		});
		await this.waitForLoadState();
	}
}
