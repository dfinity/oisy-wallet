import {
	ACTIVITY_TRANSACTION_SKELETON_PREFIX,
	ACTIVITY_TRANSACTIONS_PLACEHOLDER,
	NAVIGATION_ITEM_ACTIVITY
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type ActivityPageParams = HomepageLoggedInParams;

export class ActivityPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: ActivityPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_ACTIVITY);
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
			testId: ACTIVITY_TRANSACTIONS_PLACEHOLDER,
			options: { state: 'visible', timeout: 60000 }
		});
	}
}
