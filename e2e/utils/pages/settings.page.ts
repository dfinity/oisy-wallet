import {
	NAVIGATION_ITEM_SETTINGS,
	SETTINGS_ADDRESS_LABEL
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type SettingsPageParams = HomepageLoggedInParams;

export class SettingsPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: SettingsPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_SETTINGS);

		await this.mockSelector({ selector: `[data-tid="${SETTINGS_ADDRESS_LABEL}"]` });

		await this.waitForLoadState();
	}
}
