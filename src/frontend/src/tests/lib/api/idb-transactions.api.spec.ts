import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
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

	const mockTransactions1 = createMockEthTransactions(3);
	const mockTransactions2 = createMockBtcTransactionsUi(7);
	const mockCertifiedTransactions2 = mockTransactions2.map((transaction) => ({
		data: transaction,
		certified: false
	}));

	const mockParams = {
		identity: mockIdentity,
		idbTransactionsStore: mockIdbTransactionsStore
	};

	beforeEach(() => {
		vi.clearAllMocks();

		ethTransactionsStore.reset();

		ethTransactionsStore.set({
			tokenId: mockToken1.id,
			transactions: mockTransactions1
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
				tokenId: mockToken1.id,
				networkId: mockToken1.network.id,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();

			await setIdbTransactionsStore({
				...mockParams,
				identity: undefined,
				tokenId: mockToken1.id,
				networkId: mockToken1.network.id,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should not set the transactions in the IDB if the transactions store data is nullish', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				tokenId: mockToken1.id,
				networkId: mockToken1.network.id,
				transactionsStoreData: undefined
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should set the transactions in the IDB', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				tokenId: mockToken1.id,
				networkId: mockToken1.network.id,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
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
		});

		it('should set the certified transactions in the IDB', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				tokenId: mockToken2.id,
				networkId: mockToken2.network.id,
				transactionsStoreData: get(btcTransactionsStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken2.id.description,
					mockToken2.network.id.description
				],
				mockTransactions2,
				mockIdbTransactionsStore
			);
		});

		it('should not set the transactions in the IDB if the transactions are nullish for the token', async () => {
			ethTransactionsStore.nullify(mockToken1.id);

			await setIdbTransactionsStore({
				...mockParams,
				tokenId: mockToken1.id,
				networkId: mockToken1.network.id,
				transactionsStoreData: get(ethTransactionsStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
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
