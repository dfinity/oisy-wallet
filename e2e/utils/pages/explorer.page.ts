import { NAVIGATION_ITEM_EXPLORER } from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type ExplorerPageParams = HomepageLoggedInParams;

export class ExplorerPage extends HomepageLoggedIn {
	constructor({ page, iiPage, viewportSize }: ExplorerPageParams) {
		super({ page, iiPage, viewportSize });
	}

	override async extendWaitForReady(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_EXPLORER);
		await this.waitForLoadState();
	}
}
