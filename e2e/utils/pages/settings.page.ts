import {
	CAROUSEL_SLIDE_NAVIGATION,
	NAVIGATION_ITEM_SETTINGS,
	SETTINGS_ADDRESS_LABEL
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type SettingsPageParams = HomepageLoggedInParams;

export class SettingsPage extends HomepageLoggedIn {
	constructor(params: SettingsPageParams) {
		super(params);
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_SETTINGS);

		await this.mockSelector({ selector: `[data-tid="${SETTINGS_ADDRESS_LABEL}"]` });

		await this.getLocatorByTestId({ testId: CAROUSEL_SLIDE_NAVIGATION }).waitFor({
			state: 'hidden'
		});

		await this.waitForLoadState();
	}
}
