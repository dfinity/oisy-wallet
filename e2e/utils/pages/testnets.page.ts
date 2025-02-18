import { expect } from '@playwright/test';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

type TestnetsPageParams = HomepageLoggedInParams;

interface TestnetConfig {
	name: string;
	networkSymbol: string;
	tokenSymbol: string;
}

export const TestnetCases: TestnetConfig[] = [
	{
		name: 'enable BTC (Testnet)',
		networkSymbol: 'BTC (Testnet)',
		tokenSymbol: 'BTC (Testnet)'
	},
	{
		name: 'enable BTC (Regtest)',
		networkSymbol: 'BTC (Regtest)',
		tokenSymbol: 'BTC (Regtest)'
	},
	{
		name: 'enable SepoliaETH',
		networkSymbol: 'SepoliaETH',
		tokenSymbol: 'SepoliaETH'
	},
	{
		name: 'enable SOL (Testnet)',
		networkSymbol: 'SOL (Testnet)',
		tokenSymbol: 'SOL (Testnet)'
	},
	{
		name: 'enable SOL (Devnet)',
		networkSymbol: 'SOL (Devnet)',
		tokenSymbol: 'SOL (Devnet)'
	},
	{
		name: 'enable SOL (Local)',
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
		await this.setCarouselFirstSlide();
		await this.waitForLoadState();
	}
}
