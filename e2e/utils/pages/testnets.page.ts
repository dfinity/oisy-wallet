import { expect } from '@playwright/test';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type TestnetsPageParams = HomepageLoggedInParams;

export class TestnetsPage extends HomepageLoggedIn {
	constructor({ page, iiPage }: TestnetsPageParams) {
		super({ page, iiPage });
	}

	async enableTestnets({
		networkSymbol,
		tokenSymbol
	}: {
		networkSymbol: string;
		tokenSymbol: string;
	}): Promise<void> {
		await this.activateTestnetSettings();
		await this.toggleNetworkSelector({ networkSymbol });
		await expect(
			this.getTokenCardLocator({
				tokenSymbol,
				networkSymbol
			})
		).toBeVisible();
		await this.waitForLoadState();
		await this.setCarouselFirstSlide();
		await this.waitForLoadState();
	}
}
