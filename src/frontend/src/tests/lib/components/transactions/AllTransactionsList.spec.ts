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
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import * as transactionsUtils from '$lib/utils/transactions.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { createMockBtcTransactionsUi } from '$tests/mocks/blockchain-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import en from '$tests/mocks/i18n.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverOnce,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('AllTransactionsList', () => {
	beforeAll(() => {
		vi.resetAllMocks();

		vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

		vi.spyOn(ethEnv, 'SUPPORTED_ETHEREUM_NETWORK_IDS', 'get').mockImplementation(() => [
			ETHEREUM_NETWORK_ID,
			SEPOLIA_NETWORK_ID
		]);

		btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
		ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
		icTransactionsStore.reset(ICP_TOKEN_ID);
		solTransactionsStore.reset(SOLANA_TOKEN_ID);

		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

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
			expect(getByText('Today')).toBeInTheDocument();

			const yesterdayDateGroup = getByTestId('all-transactions-date-group-1');

			expect(yesterdayDateGroup).toBeInTheDocument();
			expect(getByText('Yesterday')).toBeInTheDocument();
		});

		it('should render the transactions list with all the transactions', () => {
			const { container } = render(AllTransactionsList);

			const transactionComponents = Array.from(container.querySelectorAll('button.contents'));

			expect(transactionComponents).toHaveLength(
				btcTransactionsNumber + ethTransactionsNumber + icTransactionsNumber
			);
		});
	});

	// Regression coverage for the "Clear filter leaves the list capped at the
	// first page" bug: clearing a narrow filter used to keep
	// `AllTransactionsScroll` stuck at `pages = 1` because the upstream
	// gix-components `InfiniteScroll` does not re-fire its `IntersectionObserver`
	// for a sentinel that stays in view as the list grows under it. Re-keying
	// the `InfiniteScroll` on the persisted filter signature re-runs the
	// load-on-mount cycle with a fresh observer.
	describe('when the persisted filter changes', () => {
		const todayTimestamp = new Date().getTime();
		const sendCount = 2;
		const receiveCount = 15;

		beforeAll(() => {
			Object.defineProperty(window, 'IntersectionObserver', {
				writable: true,
				configurable: true,
				value: IntersectionObserverOnce
			});
		});

		beforeEach(() => {
			btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
			ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
			icTransactionsStore.reset(ICP_TOKEN_ID);
			solTransactionsStore.reset(SOLANA_TOKEN_ID);

			btcTransactionsStore.append({
				tokenId: BTC_MAINNET_TOKEN_ID,
				transactions: createMockBtcTransactionsUi(sendCount).map((transaction) => ({
					data: { ...transaction, type: 'send', timestamp: BigInt(todayTimestamp) },
					certified: false
				}))
			});

			btcTransactionsStore.append({
				tokenId: BTC_MAINNET_TOKEN_ID,
				transactions: createMockBtcTransactionsUi(receiveCount).map((transaction) => ({
					data: { ...transaction, type: 'receive', timestamp: BigInt(todayTimestamp) },
					certified: false
				}))
			});

			localStorage.clear();
			transactionsFilterStore.clear();
		});

		afterEach(() => {
			transactionsFilterStore.clear();
		});

		afterAll(() => {
			Object.defineProperty(window, 'IntersectionObserver', {
				writable: true,
				configurable: true,
				value: IntersectionObserverActive
			});
		});

		it('creates a new IntersectionObserver when the filter signature changes', async () => {
			let constructorCalls = 0;

			class TrackedIntersectionObserver extends IntersectionObserverOnce {
				constructor(callback: IntersectionObserverCallback) {
					super(callback);
					constructorCalls++;
				}
			}

			Object.defineProperty(window, 'IntersectionObserver', {
				writable: true,
				configurable: true,
				value: TrackedIntersectionObserver
			});

			render(AllTransactionsList);
			await tick();

			const initialCalls = constructorCalls;

			expect(initialCalls).toBeGreaterThan(0);

			transactionsFilterStore.toggleType('send');
			await tick();

			expect(constructorCalls).toBeGreaterThan(initialCalls);

			const callsAfterApply = constructorCalls;

			transactionsFilterStore.clear();
			await tick();

			expect(constructorCalls).toBeGreaterThan(callsAfterApply);

			Object.defineProperty(window, 'IntersectionObserver', {
				writable: true,
				configurable: true,
				value: IntersectionObserverOnce
			});
		});

		it('re-runs the pagination cycle after clearing a narrow filter', async () => {
			transactionsFilterStore.toggleType('send');

			const { container } = render(AllTransactionsList);
			await tick();

			const filteredRows = container.querySelectorAll('button.contents');

			expect(filteredRows).toHaveLength(sendCount);

			transactionsFilterStore.clear();
			await tick();

			const rowsAfterClear = container.querySelectorAll('button.contents');

			expect(rowsAfterClear).toHaveLength(sendCount + receiveCount);
		});
	});
});
