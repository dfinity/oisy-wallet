import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
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
	}
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
