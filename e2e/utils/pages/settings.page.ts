import { NAVIGATION_ITEM_SETTINGS } from '../../../src/frontend/src/lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type SettingsPageParams = HomepageLoggedInParams;

export class SettingsPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: SettingsPageParams) {
		super({ page, iiPage, viewportSize });
	}

	/**
	 * @override
	 */
	async extendWaitForReady(): Promise<void> {
		await this.clickByTestId(NAVIGATION_ITEM_SETTINGS);
	}
}
