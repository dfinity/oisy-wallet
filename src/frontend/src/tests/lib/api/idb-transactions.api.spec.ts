import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import {
	deleteIdbBtcTransactions,
	deleteIdbEthTransactions,
	deleteIdbIcTransactions,
	deleteIdbSolTransactions,
	setIdbTransactionsStore
} from '$lib/api/idb-transactions.api';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';
import { createStore } from 'idb-keyval';
import { get } from 'svelte/store';

vi.mock('idb-keyval', () => ({
	createStore: vi.fn(() => ({
		/* mock store implementation */
	})),
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn(),
	update: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

describe('idb-transactions.api', () => {
	const mockIdbTransactionsStore = createStore('mock-store', 'mock-store');

	const mockToken1 = ETHEREUM_TOKEN;
	const mockToken2 = BTC_MAINNET_TOKEN;
	const mockToken3 = USDC_TOKEN;
	const mockTokens = [mockToken1, mockToken2, mockToken3];

	const mockTransactions1 = createMockEthTransactions(3);
	const mockTransactions2 = createMockBtcTransactionsUi(7);
	const mockCertifiedTransactions2 = mockTransactions2.map((transaction) => ({
		data: transaction,
		certified: false
	}));
	const mockTransactions3 = createMockEthTransactions(5);

	const mockParams = {
		identity: mockIdentity,
		idbTransactionsStore: mockIdbTransactionsStore,
		tokens: mockTokens
	};

	beforeEach(() => {
		vi.clearAllMocks();

		ethTransactionsStore.reset();

		ethTransactionsStore.set({
			tokenId: mockToken1.id,
			transactions: mockTransactions1
		});
		ethTransactionsStore.set({
			tokenId: mockToken3.id,
			transactions: mockTransactions3
		});

		btcTransactionsStore.reset(mockToken2.id);

		btcTransactionsStore.append({
			tokenId: mockToken2.id,
			transactions: mockCertifiedTransactions2
		});
	});

	describe('setIdbTransactionsStore', () => {
		it('should not set the transactions in the IDB if the identity is nullish', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				identity: null,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();

			await setIdbTransactionsStore({
				...mockParams,
				identity: undefined,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should not set the transactions in the IDB if the transactions store data is nullish', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				transactionsStoreData: undefined
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should set the transactions in the IDB', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledTimes(2);
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken1.id.description,
					mockToken1.network.id.description
				],
				mockTransactions1,
				mockIdbTransactionsStore
			);
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				2,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken3.id.description,
					mockToken3.network.id.description
				],
				mockTransactions3,
				mockIdbTransactionsStore
			);
		});

		it('should set the certified transactions in the IDB', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				transactionsStoreData: get(btcTransactionsStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
				[
					mockIdentity.getPrincipal().toText(),
					mockToken2.id.description,
					mockToken2.network.id.description
				],
				mockTransactions2,
				mockIdbTransactionsStore
			);
		});

		it('should not set the transactions in the IDB if the transactions are nullish for one token', async () => {
			ethTransactionsStore.nullify(mockToken1.id);

			await setIdbTransactionsStore({
				...mockParams,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
				[
					mockIdentity.getPrincipal().toText(),
					mockToken3.id.description,
					mockToken3.network.id.description
				],
				mockTransactions3,
				mockIdbTransactionsStore
			);
		});

		it('should not set the transactions in the IDB if the transactions are nullish for all tokens', async () => {
			ethTransactionsStore.nullify(mockToken1.id);
			ethTransactionsStore.nullify(mockToken3.id);

			await setIdbTransactionsStore({
				...mockParams,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should ignore errors if a single token throws', async () => {
			vi.mocked(idbKeyval.set).mockRejectedValueOnce(new Error('Mocked error'));

			await expect(
				setIdbTransactionsStore({
					...mockParams,
					transactionsStoreData: get(ethTransactionsStore)
				})
			).resolves.not.toThrow();

			expect(idbKeyval.set).toHaveBeenCalledTimes(2);
		});
	});

	describe('deleteIdbBtcTransactions', () => {
		it('should delete IC tokens', async () => {
			await deleteIdbBtcTransactions(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledExactlyOnceWith(
				mockPrincipal.toText(),
				expect.any(Object)
			);
		});
	});

	describe('deleteIdbEthTransactions', () => {
		it('should delete ETH transactions', async () => {
			await deleteIdbEthTransactions(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledExactlyOnceWith(
				mockPrincipal.toText(),
				expect.any(Object)
			);
		});
	});

	describe('deleteIdbIcTransactions', () => {
		it('should delete IC transactions', async () => {
			await deleteIdbIcTransactions(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledExactlyOnceWith(
				mockPrincipal.toText(),
				expect.any(Object)
			);
		});
	});

	describe('deleteIdbSolTransactions', () => {
		it('should delete BTC transactions', async () => {
			await deleteIdbSolTransactions(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledExactlyOnceWith(
				mockPrincipal.toText(),
				expect.any(Object)
			);
		});
	});
});
