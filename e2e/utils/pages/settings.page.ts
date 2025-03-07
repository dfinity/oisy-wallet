import { NAVIGATION_ITEM_SETTINGS, SETTINGS_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';
import { AppPath } from '$lib/constants/routes.constants';

export type SettingsPageParams = HomepageLoggedInParams;

export class SettingsPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: SettingsPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo({ testId: NAVIGATION_ITEM_SETTINGS , expectedPath: AppPath.Settings });

		await this.mockSelector({ selector: `[data-tid="${SETTINGS_ADDRESS_LABEL}"]` });

		await this.waitForLoadState();
	}
}
