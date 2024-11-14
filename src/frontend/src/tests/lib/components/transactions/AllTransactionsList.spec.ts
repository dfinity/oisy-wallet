import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import * as btcEnv from '$env/networks.btc.env';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens.btc.env';
import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
import * as transactionsUtils from '$lib/utils/transactions.utils';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('AllTransactionsList', () => {
	it('should call the function to map the transactions list', () => {
		const spyMapAllTransactionsUi = vi.spyOn(transactionsUtils, 'mapAllTransactionsUi');

		render(AllTransactionsList);

		expect(spyMapAllTransactionsUi).toHaveBeenCalled();

		spyMapAllTransactionsUi.mockRestore();
	});

	describe('when the transactions list is empty', () => {
		it('should render the placeholder', () => {
			const { getByText } = render(AllTransactionsList);

			expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
		});
	});

	describe('when the transactions list is not empty', () => {
		const btcTransactionsNumber = 5;

		beforeEach(() => {
			vi.resetAllMocks();

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		});

		btcTransactionsStore.append({
			tokenId: BTC_MAINNET_TOKEN_ID,
			transactions: createMockBtcTransactionsUi(btcTransactionsNumber).map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});

		it('should not render the placeholder', () => {
			const { queryByText } = render(AllTransactionsList);

			expect(queryByText(en.transactions.text.transaction_history)).not.toBeInTheDocument();
		});

		it('should render the transactions list', () => {
			const { container } = render(AllTransactionsList);

			const transactionComponents = Array.from(container.querySelectorAll('div')).filter(
				(el) => el.parentElement === container
			);

			expect(transactionComponents).toHaveLength(btcTransactionsNumber);
		});
	});
});
