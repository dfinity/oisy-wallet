import { CAROUSEL_SLIDE_NAVIGATION, TOKEN_CARD } from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

type TransactionsPageParams = HomepageLoggedInParams;

interface TransactionsConfig {
	tokenSymbol: string;
	networkId: string;
}

export const TransactionCases: TransactionsConfig[] = [
	{
		tokenSymbol: 'BTC',
		networkId: 'BTC'
	},
	{
		tokenSymbol: 'ETH',
		networkId: 'ETH'
	},
	{
		tokenSymbol: 'ICP',
		networkId: 'ICP'
	},
	{
		tokenSymbol: 'SOL',
		networkId: 'SOL'
	}
];

export class TransactionsPage extends HomepageLoggedIn {
	constructor(params: TransactionsPageParams) {
		super(params);
	}

	showTransactions = async ({
		tokenSymbol,
		networkId
	}: {
		tokenSymbol: string;
		networkId: string;
	}) => {
		await this.toggleNetworkSelector({ networkSymbol: networkId });
		const testId = `${TOKEN_CARD}-${tokenSymbol}-${networkId}`;
		await this.clickByTestId({ testId });
		await this.getLocatorByTestId({ testId: CAROUSEL_SLIDE_NAVIGATION }).waitFor({
			state: 'hidden'
		});
		await this.waitForLoadState();
		await this.takeScreenshot();
	};
}
