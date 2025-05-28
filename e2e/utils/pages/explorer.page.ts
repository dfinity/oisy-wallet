import { AppPath } from '$lib/constants/routes.constants';
import {
	CAROUSEL_SLIDE_NAVIGATION,
	NAVIGATION_ITEM_EXPLORER
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type ExplorerPageParams = HomepageLoggedInParams;

export class ExplorerPage extends HomepageLoggedIn {
	constructor(params: ExplorerPageParams) {
		super(params);
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo({ testId: NAVIGATION_ITEM_EXPLORER, expectedPath: AppPath.Explore });
		await this.getLocatorByTestId({ testId: CAROUSEL_SLIDE_NAVIGATION }).waitFor({
			state: 'hidden'
		});
		await this.waitForLoadState();
	}
}
