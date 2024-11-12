import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import type { MockedFunction } from 'vitest';

vi.mock('$lib/utils/transactions.utils', () => ({
	mapAllTransactionsUi: vi.fn()
}));

describe('AllTransactionsList', () => {
	const mockedMapAllTransactionsUi = mapAllTransactionsUi as MockedFunction<
		typeof mapAllTransactionsUi
	>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should call the function to map the transactions list', () => {
		mockedMapAllTransactionsUi.mockReturnValue([]);

		render(AllTransactionsList);

		expect(mapAllTransactionsUi).toHaveBeenCalled();
	});

	describe('when the transactions list is empty', () => {
		beforeEach(() => {
			mockedMapAllTransactionsUi.mockReturnValue([]);
		});

		it('should render the placeholder', () => {
			mockedMapAllTransactionsUi.mockReturnValue([]);

			const { getByText } = render(AllTransactionsList);

			expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
		});
	});

	describe('when the transactions list is not empty', () => {
		const btcTransactionsNumber = 5;

		beforeEach(() => {
			mockedMapAllTransactionsUi.mockReturnValue(
				createMockBtcTransactionsUi(btcTransactionsNumber).map((transaction) => ({
					...transaction,
					component: BtcTransaction
				}))
			);
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
