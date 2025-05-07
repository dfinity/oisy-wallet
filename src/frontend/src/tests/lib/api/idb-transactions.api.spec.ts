import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { setIdbTransactionsStore } from '$lib/api/idb-transactions.api';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc-transactions.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
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
	const mockToken2 = PEPE_TOKEN;
	const mockToken3 = BTC_MAINNET_TOKEN;
	const mockToken4 = USDC_TOKEN;

	const mockTransactions1 = createMockEthTransactions(3);
	const mockTransactions2 = createMockEthTransactions(5);
	const mockTransactions3 = createMockBtcTransactionsUi(7);
	const mockCertifiedTransactions3 = mockTransactions3.map((transaction) => ({
		data: transaction,
		certified: false
	}));

	const mockTokens = [mockToken1, mockToken2, mockToken3, mockToken4];

	const mockParams = {
		identity: mockIdentity,
		tokens: mockTokens,
		idbTransactionsStore: mockIdbTransactionsStore
	};

	beforeEach(() => {
		vi.clearAllMocks();

		ethTransactionsStore.reset();

		ethTransactionsStore.set({
			tokenId: mockToken1.id,
			transactions: mockTransactions1
		});

		ethTransactionsStore.set({
			tokenId: mockToken2.id,
			transactions: mockTransactions2
		});

		btcTransactionsStore.reset(mockToken3.id);

		btcTransactionsStore.append({
			tokenId: mockToken3.id,
			transactions: mockCertifiedTransactions3
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
					mockToken2.id.description,
					mockToken2.network.id.description
				],
				mockTransactions2,
				mockIdbTransactionsStore
			);
		});

		it('should set the certified transactions in the IDB', async () => {
			await setIdbTransactionsStore({
				...mockParams,
				transactionsStoreData: get(btcTransactionsStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken3.id.description,
					mockToken3.network.id.description
				],
				mockTransactions3,
				mockIdbTransactionsStore
			);
		});

		it('should not set the transactions in the IDB if the transactions are nullish for the token', async () => {
			ethTransactionsStore.nullify(mockToken1.id);

			await setIdbTransactionsStore({
				...mockParams,
				transactionsStoreData: get(ethTransactionsStore)
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
	});
});
