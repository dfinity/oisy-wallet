import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
import type { AllTransactionUi, AllTransactionUiNonEmptyList } from '$lib/types/transaction';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { render } from '@testing-library/svelte';

describe('TransactionsDateGroup', () => {
	const btcTransactionsNumber = 5;
	const ethTransactionsNumber = 3;

	const todayTimestamp = new Date().getTime();

	const mockBtcTransactionsUi: AllTransactionUi[] = createMockBtcTransactionsUi(
		btcTransactionsNumber
	).map((transaction) => ({
		...transaction,
		timestamp: BigInt(todayTimestamp),
		token: BTC_MAINNET_TOKEN,
		component: BtcTransaction
	}));

	const mockEthTransactionsUi: AllTransactionUi[] = createMockEthTransactions(
		ethTransactionsNumber
	).map((transaction) => ({
		...transaction,
		timestamp: todayTimestamp,
		id: transaction.hash,
		uiType: 'send',
		token: ETHEREUM_TOKEN,
		component: EthTransaction
	}));

	const mockTransactions = [
		...mockBtcTransactionsUi,
		...mockEthTransactionsUi
	] as AllTransactionUiNonEmptyList;

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
