import {
	CAROUSEL_SLIDE_NAVIGATION,
	NO_TRANSACTIONS_PLACEHOLDER,
	TOKEN_CARD
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

type TransactionsPageParams = HomepageLoggedInParams;

interface TransactionsConfig {
	tokenSymbol: string;
	networkId: string;
	waitForPlaceholder?: boolean;
}

export const TransactionCases: TransactionsConfig[] = [
	{
		tokenSymbol: 'BTC',
		networkId: 'BTC',
		waitForPlaceholder: false
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
	},
	{
		tokenSymbol: 'ETH',
		networkId: 'BASE'
	},
	{
		tokenSymbol: 'BNB',
		networkId: 'BSC'
	},
	{
		tokenSymbol: 'POL',
		networkId: 'POL'
	}
];

export class TransactionsPage extends HomepageLoggedIn {
	constructor(params: TransactionsPageParams) {
		super(params);
	}

	showTransactions = async ({
		tokenSymbol,
		networkId,
		waitForPlaceholder = true
	}: TransactionsConfig) => {
		await this.toggleNetworkSelector({ networkSymbol: networkId });
		const testId = `${TOKEN_CARD}-${tokenSymbol}-${networkId}`;
		await this.clickByTestId({ testId });
		await this.getLocatorByTestId({ testId: CAROUSEL_SLIDE_NAVIGATION }).waitFor({
			state: 'hidden'
		});
		if (waitForPlaceholder) {
			await this.waitForByTestId({ testId: NO_TRANSACTIONS_PLACEHOLDER });
		}
		await this.waitForLoadState();
		await this.takeScreenshot();
	};
}
