import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
import type {
	AllTransactionUiWithCmp,
	AllTransactionUiWithCmpNonEmptyList
} from '$lib/types/transaction';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { render } from '@testing-library/svelte';

describe('TransactionsDateGroup', () => {
	const btcTransactionsNumber = 5;
	const ethTransactionsNumber = 3;

	const todayTimestamp = new Date().getTime();

	const mockBtcTransactionsUi: AllTransactionUiWithCmp[] = createMockBtcTransactionsUi(
		btcTransactionsNumber
	).map((transaction) => ({
		transaction,
		timestamp: BigInt(todayTimestamp),
		token: BTC_MAINNET_TOKEN,
		component: 'bitcoin'
	}));

	const mockEthTransactionsUi: AllTransactionUiWithCmp[] = createMockEthTransactions(
		ethTransactionsNumber
	).map((transaction) => ({
		transaction: {
			...transaction,
			id: transaction.hash ?? '',
			type: 'send'
		},
		timestamp: todayTimestamp,
		token: ETHEREUM_TOKEN,
		component: 'ethereum'
	}));

	const mockTransactions = [
		...mockBtcTransactionsUi,
		...mockEthTransactionsUi
	] as AllTransactionUiWithCmpNonEmptyList;

	it('should render the date', () => {
		const { getByText } = render(TransactionsDateGroup, {
			props: {
				formattedDate: 'today',
				transactions: mockTransactions
			}
		});

		expect(getByText('today')).toBeInTheDocument();
	});

	it('should render the transactions list', () => {
		const { container } = render(TransactionsDateGroup, {
			props: {
				formattedDate: 'today',
				transactions: mockTransactions
			}
		});

		const transactionComponents = Array.from(container.querySelectorAll('div')).filter(
			(el) => el.parentElement?.parentElement === container
		);

		expect(transactionComponents).toHaveLength(btcTransactionsNumber + ethTransactionsNumber);
	});
});
