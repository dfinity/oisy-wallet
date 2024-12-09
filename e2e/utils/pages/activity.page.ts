import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';
import { NAVIGATION_ITEM_ACTIVITY } from '$lib/constants/test-ids.constants';

export type ActivityPageParams = HomepageLoggedInParams;

export class ActivityPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: ActivityPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_ACTIVITY);
		await this.waitForLoadState();
	}
}
