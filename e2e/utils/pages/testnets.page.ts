import { expect } from '@playwright/test';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';
import { TOKEN_BALANCE, TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';

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
		await this.waitForLoadState();
		await this.waitForByTestId({
			testId: TOKEN_SKELETON_TEXT,
			options: { state: 'hidden', timeout: 60000 }
		});
		await this.waitForByTestId({
			testId: `[data-tid^="${TOKEN_BALANCE}-"]`,
			options: { state: 'visible', timeout: 60000 }
		});
	}
}
