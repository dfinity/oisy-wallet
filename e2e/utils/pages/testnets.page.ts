import { TOKEN_BALANCE, TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
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
		networkSymbol: 'SOL (Devnet)',
		tokenSymbol: 'SOL (Devnet)'
	},
	{
		networkSymbol: 'SOL (Local)',
		tokenSymbol: 'SOL (Local)'
	},
	{
		networkSymbol: 'SepoliaBASE',
		tokenSymbol: 'SepoliaETH'
	},
	{
		networkSymbol: 'BSC (Testnet)',
		tokenSymbol: 'BNB (Testnet)'
	},
	{
		networkSymbol: 'POL (Amoy Testnet)',
		tokenSymbol: 'POL (Amoy Testnet)'
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

		if (tokenSymbol !== 'BTC (Testnet)') {
			const skeletons = this.getLocatorByTestId({ testId: TOKEN_SKELETON_TEXT });
			const countSkeletons = await skeletons.count();
			await Promise.all(
				Array.from({ length: countSkeletons }, (_, i) =>
					skeletons.nth(i).waitFor({ state: 'hidden', timeout: 60000 })
				)
			);

			const balances = this.getLocatorByTestId({ testId: `[data-tid^="${TOKEN_BALANCE}-"]` });
			const countBalances = await balances.count();
			await Promise.all(
				Array.from({ length: countBalances }, (_, i) =>
					skeletons.nth(i).waitFor({ state: 'visible', timeout: 60000 })
				)
			);
		}
	}
}
