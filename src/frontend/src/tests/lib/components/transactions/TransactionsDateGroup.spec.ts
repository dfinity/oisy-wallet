import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
import type { AllTransactionsUi } from '$lib/types/transaction';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { render } from '@testing-library/svelte';

describe('TransactionsDateGroup', () => {
	describe('when the transactions list is empty', () => {
		it('should render nothing', () => {
			const { container } = render(TransactionsDateGroup, {
				props: {
					date: 'today',
					transactions: []
				}
			});

			expect(container.innerHTML).toBe('');
		});
	});

	describe('when the transactions list is not empty', () => {
		const btcTransactionsNumber = 5;
		const ethTransactionsNumber = 3;

		const todayTimestamp = new Date().getTime();

		const mockBtcTransactionsUi: AllTransactionsUi = createMockBtcTransactionsUi(
			btcTransactionsNumber
		).map((transaction) => ({
			...transaction,
			timestamp: BigInt(todayTimestamp),
			token: BTC_MAINNET_TOKEN,
			component: BtcTransaction
		}));

		const mockEthTransactionsUi: AllTransactionsUi = createMockEthTransactions(
			ethTransactionsNumber
		).map((transaction) => ({
			...transaction,
			timestamp: todayTimestamp,
			id: transaction.hash,
			uiType: 'send',
			token: ETHEREUM_TOKEN,
			component: EthTransaction
		}));

		const mockTransactions: AllTransactionsUi = [
			...mockBtcTransactionsUi,
			...mockEthTransactionsUi
		];

		it('should render the date', () => {
			const { getByText } = render(TransactionsDateGroup, {
				props: {
					date: 'today',
					transactions: mockTransactions
				}
			});

			expect(getByText('today')).toBeInTheDocument();
		});

		it('should render the transactions list', () => {
			const { container } = render(TransactionsDateGroup, {
				props: {
					date: 'today',
					transactions: mockTransactions
				}
			});

			const transactionComponents = Array.from(container.querySelectorAll('div')).filter(
				(el) => el.parentElement?.parentElement === container
			);

			expect(transactionComponents).toHaveLength(btcTransactionsNumber + ethTransactionsNumber);
		});
	});
});
