import { TOKEN_BALANCE, TOKEN_CARD, TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
import { expect } from '@playwright/test';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

type ManageTokensPageParams = HomepageLoggedInParams;

interface ManageTokensConfig {
	type: string;
	tokenSymbol: string;
	networkSymbol: string;
}

export const ManageTokensCases: ManageTokensConfig[] = [
	{
		type: 'ICRC',
		tokenSymbol: 'ckSepoliaETH',
		networkSymbol: 'ICP'
	},
	{
		type: 'ERC20',
		tokenSymbol: 'SHIB',
		networkSymbol: 'ETH'
	},
	{
		type: 'SepoliaERC20',
		tokenSymbol: 'USDC',
		networkSymbol: 'SepoliaETH'
	},
	{
		type: 'SPL',
		tokenSymbol: 'EURC',
		networkSymbol: 'SOL'
	},
		{
		type: 'DevnetSPL',
		tokenSymbol: 'DevnetUSDC',
		networkSymbol: 'SOL (Devnet)'
	},
	{
		type: 'Bitcoin',
		tokenSymbol: 'BTC',
		networkSymbol: 'Bitcoin'
	}
];
];

export class ManageTokensPage extends HomepageLoggedIn {
	constructor(params: ManageTokensPageParams) {
		super(params);
	}

	enableAndDisableToken = async ({
		tokenSymbol,
		networkSymbol
	}: {
		tokenSymbol: string;
		networkSymbol: string;
	}) => {
		await this.activateTestnetSettings();
		await this.toggleTokenInList({
			tokenSymbol,
			networkSymbol
		});

		await expect(
			this.getTokenCardLocator({
				tokenSymbol,
				networkSymbol
			})
		).toBeVisible();

		await this.waitForLoadState();

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

		await this.takeScreenshot({
			freezeCarousel: true,
			centeredElementTestId: `${TOKEN_CARD}-${tokenSymbol}-${networkSymbol}`
		});
		await this.toggleTokenInList({
			tokenSymbol,
			networkSymbol
		});

		await expect(
			this.getTokenCardLocator({
				tokenSymbol,
				networkSymbol
			})
		).not.toBeVisible();
	};
}
