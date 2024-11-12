import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import {
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN_ID,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens.btc.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('Activity', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		[BTC_MAINNET_TOKEN_ID, BTC_TESTNET_TOKEN_ID, BTC_REGTEST_TOKEN_ID].forEach((tokenId) => {
			btcTransactionsStore.reset(tokenId);
		});

		ethTransactionsStore.reset();
	});

	it('renders the placeholder when the transactions stores are empty', () => {
		const { getByText } = render(AllTransactionsList);

		expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
	});
});
