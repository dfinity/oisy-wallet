import { CAROUSEL_SLIDE_NAVIGATION } from '$lib/constants/test-ids.constants';
import { expect } from '@playwright/test';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

type TestnetsPageParams = HomepageLoggedInParams;

interface TestnetConfig {
	networkSymbol: string;
	tokenSymbol: string;
}

export const TestnetCases: TestnetConfig[] = [
	{
		networkSymbol: 'BTC (Testnet)',
		tokenSymbol: 'BTC (Testnet)'
	},
	{
		networkSymbol: 'BTC (Regtest)',
		tokenSymbol: 'BTC (Regtest)'
	},
	{
		networkSymbol: 'SepoliaETH',
		tokenSymbol: 'SepoliaETH'
	},
	{
		networkSymbol: 'SOL (Testnet)',
		tokenSymbol: 'SOL (Testnet)'
	},
	{
		networkSymbol: 'SOL (Devnet)',
		tokenSymbol: 'SOL (Devnet)'
	},
	{
		networkSymbol: 'SOL (Local)',
		tokenSymbol: 'SOL (Local)'
	}
];

export class TestnetsPage extends HomepageLoggedIn {
	constructor(params: TestnetsPageParams) {
		super(params);
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
		await this.getLocatorByTestId({ testId: CAROUSEL_SLIDE_NAVIGATION }).waitFor({ state: 'hidden' });
		await this.waitForLoadState();
	}
}
