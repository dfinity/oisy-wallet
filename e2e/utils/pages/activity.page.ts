import { NAVIGATION_ITEM_ACTIVITY } from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';
import { AppPath } from '$lib/constants/routes.constants';

export type ActivityPageParams = HomepageLoggedInParams;

export class ActivityPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: ActivityPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo({ testId: NAVIGATION_ITEM_ACTIVITY, expectedPath: AppPath.Activity });
		await this.waitForLoadState();
	}
}
