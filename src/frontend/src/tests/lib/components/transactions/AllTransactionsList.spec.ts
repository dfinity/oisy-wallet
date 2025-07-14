import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
import * as transactionsUtils from '$lib/utils/transactions.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import en from '$tests/mocks/i18n.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('AllTransactionsList', () => {
	beforeAll(() => {
		vi.resetAllMocks();

		vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

		vi.spyOn(ethEnv, 'SUPPORTED_ETHEREUM_NETWORK_IDS', 'get').mockImplementation(() => [
			ETHEREUM_NETWORK_ID,
			SEPOLIA_NETWORK_ID
		]);
	});

	it('should call the function to map the transactions list', () => {
		const spyMapAllTransactionsUi = vi.spyOn(transactionsUtils, 'mapAllTransactionsUi');

		render(AllTransactionsList);

		expect(spyMapAllTransactionsUi).toHaveBeenCalled();

		spyMapAllTransactionsUi.mockRestore();
	});

	describe('when the transactions list is empty', () => {
		beforeEach(() => {
			btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
			ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
			icTransactionsStore.reset(ICP_TOKEN_ID);
			solTransactionsStore.reset(SOLANA_TOKEN_ID);
		});

		it('should render the placeholder', () => {
			const { getByText } = render(AllTransactionsList);

			expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
		});

		it('should not render the skeleton', () => {
			const { container } = render(AllTransactionsList);

			Array.from({ length: 5 }).forEach((_, i) => {
				const skeleton: HTMLParagraphElement | null = container.querySelector(
					`div[data-tid="all-transactions-skeleton-card-${i}"]`
				);

				expect(skeleton).toBeNull();
			});
		});
	});

	describe('when the transactions list is not empty', () => {
		const btcTransactionsNumber = 5;
		const ethTransactionsNumber = 3;
		const icTransactionsNumber = 7;

		const todayTimestamp = new Date().getTime();
		const yesterdayTimestamp = todayTimestamp - 24 * 60 * 60 * 1000;

		beforeEach(() => {
			btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
			ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
			icTransactionsStore.reset(ICP_TOKEN_ID);
			solTransactionsStore.reset(SOLANA_TOKEN_ID);

			btcTransactionsStore.append({
				tokenId: BTC_MAINNET_TOKEN_ID,
				transactions: createMockBtcTransactionsUi(btcTransactionsNumber).map((transaction) => ({
					data: { ...transaction, timestamp: BigInt(todayTimestamp) },
					certified: false
				}))
			});

			ethTransactionsStore.add({
				tokenId: ETHEREUM_TOKEN_ID,
				transactions: createMockEthTransactions(ethTransactionsNumber).map((transaction) => ({
					data: {
						...transaction,
						timestamp: yesterdayTimestamp
					},
					certified: false
				}))
			});

			icTransactionsStore.append({
				tokenId: ICP_TOKEN_ID,
				transactions: createMockIcTransactionsUi(icTransactionsNumber).map((transaction) => ({
					data: { ...transaction, timestamp: BigInt(todayTimestamp) },
					certified: false
				}))
			});

			solTransactionsStore.reset(SOLANA_TOKEN_ID);
		});

		it('should not render the placeholder', () => {
			const { queryByText } = render(AllTransactionsList);

			expect(queryByText(en.transactions.text.transaction_history)).not.toBeInTheDocument();
		});

		it('should not render the skeleton', () => {
			const { container } = render(AllTransactionsList);

			Array.from({ length: 5 }).forEach((_, i) => {
				const skeleton: HTMLParagraphElement | null = container.querySelector(
					`div[data-tid="all-transactions-skeleton-card-${i}"]`
				);

				expect(skeleton).toBeNull();
			});
		});

		it('should render the transactions list with group of dates', () => {
			const { getByText, getByTestId } = render(AllTransactionsList);

			const todayDateGroup = getByTestId('all-transactions-date-group-0');

			expect(todayDateGroup).toBeInTheDocument();
			expect(getByText('today')).toBeInTheDocument();

			const yesterdayDateGroup = getByTestId('all-transactions-date-group-1');

			expect(yesterdayDateGroup).toBeInTheDocument();
			expect(getByText('yesterday')).toBeInTheDocument();
		});

		it('should render the transactions list with all the transactions', () => {
			const { container } = render(AllTransactionsList);

			const transactionComponents = Array.from(container.querySelectorAll('div')).filter(
				(el) => el.parentElement?.parentElement?.parentElement === container
			);

			expect(transactionComponents).toHaveLength(
				btcTransactionsNumber + ethTransactionsNumber + icTransactionsNumber
			);
		});
	});
});
