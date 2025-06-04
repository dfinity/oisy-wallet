import { AppPath } from '$lib/constants/routes.constants';
import {
	ACTIVITY_TRANSACTION_SKELETON_PREFIX,
	CAROUSEL_SLIDE_NAVIGATION,
	NAVIGATION_ITEM_ACTIVITY,
	NO_TRANSACTIONS_PLACEHOLDER
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type ActivityPageParams = HomepageLoggedInParams;

export class ActivityPage extends HomepageLoggedIn {
	constructor(params: ActivityPageParams) {
		super(params);
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo({ testId: NAVIGATION_ITEM_ACTIVITY, expectedPath: AppPath.Activity });
		await this.getLocatorByTestId({ testId: CAROUSEL_SLIDE_NAVIGATION }).waitFor({
			state: 'hidden'
		});
		await this.waitForLoadState();

		await Promise.all(
			Array.from(
				{ length: 5 },
				async (_, i) =>
					await this.waitForByTestId({
						testId: `${ACTIVITY_TRANSACTION_SKELETON_PREFIX}-${i}`,
						options: { state: 'hidden', timeout: 60000 }
					})
			)
		);

		await this.waitForByTestId({
			testId: NO_TRANSACTIONS_PLACEHOLDER,
			options: { state: 'visible', timeout: 60000 }
		});
	}
}
