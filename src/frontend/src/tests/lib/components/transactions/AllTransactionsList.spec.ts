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
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import { transactionsFilterTokenKey } from '$lib/utils/transactions-filter.utils';
import * as transactionsUtils from '$lib/utils/transactions.utils';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { createMockBtcTransactionsUi } from '$tests/mocks/blockchain-transactions.mock';
import { getMockContactsUi } from '$tests/mocks/contacts.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import en from '$tests/mocks/i18n.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverOnce,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

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

	describe('when a selected token is no longer selectable', () => {
		beforeEach(() => {
			localStorage.clear();
			transactionsFilterStore.clear();
		});

		afterEach(() => {
			transactionsFilterStore.clear();
		});

		it('drops the selections that the tokens panel no longer offers', async () => {
			const selectableKey = transactionsFilterTokenKey(get(enabledFungibleNetworkTokens)[0]);

			assertNonNullish(selectableKey);

			transactionsFilterStore.toggleTokenId(selectableKey);
			transactionsFilterStore.toggleTokenId('UNKNOWN-Unknown');

			render(AllTransactionsList);
			await tick();

			expect(get(transactionsFilterStore).tokenIds).toEqual([selectableKey]);
		});

		it('keeps the other facets untouched', async () => {
			transactionsFilterStore.toggleType('send');
			transactionsFilterStore.toggleContactId('42');
			transactionsFilterStore.toggleTokenId('UNKNOWN-Unknown');

			render(AllTransactionsList);
			await tick();

			const value = get(transactionsFilterStore);

			expect(value.types).toEqual(['send']);
			expect(value.tokenIds).toEqual([]);
			expect(value.contactIds).toEqual(['42']);
		});
	});

	describe('when a selected contact is no longer selectable', () => {
		const [mockContact] = getMockContactsUi({ n: 1, name: 'Alice', addresses: [] });
		const alice = { ...mockContact, id: 1n, name: 'Alice' };

		beforeEach(() => {
			localStorage.clear();
			transactionsFilterStore.clear();
			contactsStore.reset();
		});

		afterEach(() => {
			transactionsFilterStore.clear();
			contactsStore.reset();
		});

		it('drops the selections of contacts that no longer exist', async () => {
			contactsStore.set([alice]);

			transactionsFilterStore.toggleContactId('1');
			transactionsFilterStore.toggleContactId('404');

			render(AllTransactionsList);
			await tick();

			expect(get(transactionsFilterStore).contactIds).toEqual(['1']);
		});

		it('drops every selection when the last contact is deleted', async () => {
			contactsStore.set([alice]);

			transactionsFilterStore.toggleContactId('1');

			render(AllTransactionsList);
			await tick();

			expect(get(transactionsFilterStore).contactIds).toEqual(['1']);

			contactsStore.removeContact(1n);
			await tick();

			expect(get(transactionsFilterStore).contactIds).toEqual([]);
		});

		it('does not prune while the contacts are not initialized', async () => {
			transactionsFilterStore.toggleContactId('1');

			render(AllTransactionsList);
			await tick();

			expect(get(transactionsFilterStore).contactIds).toEqual(['1']);
		});

		it('keeps the other facets untouched', async () => {
			contactsStore.set([]);

			transactionsFilterStore.toggleType('send');
			transactionsFilterStore.toggleContactId('404');

			render(AllTransactionsList);
			await tick();

			const value = get(transactionsFilterStore);

			expect(value.types).toEqual(['send']);
			expect(value.contactIds).toEqual([]);
		});
	});

	// Regression: clearing a narrow filter used to leave `AllTransactionsScroll`
	// stuck at `pages = 1` because the upstream `InfiniteScroll` observer never
	// re-fires for a sentinel that stays in view.
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

			try {
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
			} finally {
				Object.defineProperty(window, 'IntersectionObserver', {
					writable: true,
					configurable: true,
					value: IntersectionObserverOnce
				});
			}
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
