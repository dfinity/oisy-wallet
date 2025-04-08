import {
	NAVIGATION_ITEM_REWARDS,
	REWARDS_ACTIVE_CAMPAIGNS_CONTAINER
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type RewardsPageParams = HomepageLoggedInParams;

export class RewardsPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: RewardsPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_REWARDS);
		await this.mockSelector({
			selector: `[data-tid^="${REWARDS_ACTIVE_CAMPAIGNS_CONTAINER}-"][data-tid$="-badge"]`
		});
		await this.waitForLoadState();
	}
}
