import { NAVIGATION_ITEM_ACTIVITY } from '../../../src/frontend/src/lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type ActivityPageParams = HomepageLoggedInParams;

export class ActivityPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: ActivityPageParams) {
		super({ page, iiPage, viewportSize });
	}

	/**
	 * @override
	 */
	async extendWaitForReady(): Promise<void> {
		await this.clickByTestId(NAVIGATION_ITEM_ACTIVITY);
	}
}
