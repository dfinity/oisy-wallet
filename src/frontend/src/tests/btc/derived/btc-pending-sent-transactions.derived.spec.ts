import {
	BtcPendingSentTransactionsStatus,
	initPendingSentTransactionsStatus
} from '$btc/derived/btc-pending-sent-transactions-status.derived';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { get } from 'svelte/store';

const mockAddressMainnet = 'mainnet-address';
const mockAddressTestnet = 'testnet-address';
const mockAddressRegtest = 'regtest-address';
const pendingTransactionMock = {
	txid: new Uint8Array([1, 2, 3]),
	utxos: [
		{
			height: 100,
			value: 5000n,
			outpoint: {
				txid: new Uint8Array([1, 2, 3]),
				vout: 0
			}
		}
	]
};

describe('initPendingSentTransactionsStatus', () => {
	beforeEach(() => {
		btcAddressMainnetStore.reset();
		btcAddressTestnetStore.reset();
		btcAddressRegtestStore.reset();
		btcPendingSentTransactionsStore.reset();
		setupTestnetsStore('reset');
	});

	describe('testnets disabled', () => {
		beforeEach(() => {
			setupTestnetsStore('disabled');
		});

		it('should return "loading" if BTC address mainnet is not loaded', () => {
			const store = initPendingSentTransactionsStatus(mockAddressMainnet);

			expect(get(store)).toBe(BtcPendingSentTransactionsStatus.LOADING);
		});

		it('should return "loading" if pending transactions are not loaded yet for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			const store = initPendingSentTransactionsStatus(mockAddressMainnet);

			expect(get(store)).toBe(BtcPendingSentTransactionsStatus.LOADING);
		});

		it('should return "BtcPendingSentTransactionsStatus.ERROR" if pending transactions are not `null` for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactionsError({ address: mockAddressMainnet });
			const store = initPendingSentTransactionsStatus(mockAddressMainnet);

			expect(get(store)).toBe(BtcPendingSentTransactionsStatus.ERROR);
		});

		it('should return "BtcPendingSentTransactionsStatus.NONE" if address is not the mainnet bitcoin address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			const store = initPendingSentTransactionsStatus('another-address');

			expect(get(store)).toBe(BtcPendingSentTransactionsStatus.NONE);
		});

		it('should return "BtcPendingSentTransactionsStatus.SOME" if there are pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: [pendingTransactionMock]
			});
			const store = initPendingSentTransactionsStatus(mockAddressMainnet);

			expect(get(store)).toBe(BtcPendingSentTransactionsStatus.SOME);
		});

		it('should return "BtcPendingSentTransactionsStatus.NONE" if there are no pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: []
			});
			const store = initPendingSentTransactionsStatus(mockAddressMainnet);

			expect(get(store)).toBe(BtcPendingSentTransactionsStatus.NONE);
		});
	});

	describe('testnets enabled', () => {
		beforeEach(() => {
			setupTestnetsStore('enabled');
		});

		const loadAllAddresses = () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcAddressTestnetStore.set({ certified: true, data: mockAddressTestnet });
			btcAddressRegtestStore.set({ certified: true, data: mockAddressRegtest });
		};

		it('should return "loading" if some btc address is not loaded', () => {
			expect(get(initPendingSentTransactionsStatus(mockAddressMainnet))).toBe(
				BtcPendingSentTransactionsStatus.LOADING
			);

			btcAddressTestnetStore.set({ certified: true, data: mockAddressMainnet });

			expect(get(initPendingSentTransactionsStatus(mockAddressMainnet))).toBe(
				BtcPendingSentTransactionsStatus.LOADING
			);

			btcAddressTestnetStore.set({ certified: true, data: mockAddressRegtest });

			expect(get(initPendingSentTransactionsStatus(mockAddressMainnet))).toBe(
				BtcPendingSentTransactionsStatus.LOADING
			);

			btcAddressTestnetStore.reset();
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });

			expect(get(initPendingSentTransactionsStatus(mockAddressTestnet))).toBe(
				BtcPendingSentTransactionsStatus.LOADING
			);
		});

		it('should return "loading" if pending transactions are not loaded yet for the address', () => {
			loadAllAddresses();

			expect(get(initPendingSentTransactionsStatus(mockAddressTestnet))).toBe(
				BtcPendingSentTransactionsStatus.LOADING
			);
			expect(get(initPendingSentTransactionsStatus(mockAddressMainnet))).toBe(
				BtcPendingSentTransactionsStatus.LOADING
			);
		});

		it('should return "error" if pending transactions are `null`', () => {
			loadAllAddresses();
			btcPendingSentTransactionsStore.setPendingTransactionsError({ address: mockAddressTestnet });

			expect(get(initPendingSentTransactionsStatus(mockAddressTestnet))).toBe(
				BtcPendingSentTransactionsStatus.ERROR
			);

			btcPendingSentTransactionsStore.setPendingTransactionsError({ address: mockAddressMainnet });

			expect(get(initPendingSentTransactionsStatus(mockAddressMainnet))).toBe(
				BtcPendingSentTransactionsStatus.ERROR
			);
		});

		it('should return "BtcPendingSentTransactionsStatus.NONE" if address is not a bitcoin address', () => {
			loadAllAddresses();

			expect(get(initPendingSentTransactionsStatus('another-address'))).toBe(
				BtcPendingSentTransactionsStatus.NONE
			);
		});

		it('should return "BtcPendingSentTransactionsStatus.SOME" if there are pending transactions for the address', () => {
			loadAllAddresses();
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressTestnet,
				pendingTransactions: [pendingTransactionMock]
			});

			expect(get(initPendingSentTransactionsStatus(mockAddressTestnet))).toBe(
				BtcPendingSentTransactionsStatus.SOME
			);
		});

		it('should return "BtcPendingSentTransactionsStatus.NONE" if pending transactions are present and empty', () => {
			loadAllAddresses();
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressTestnet,
				pendingTransactions: []
			});

			expect(get(initPendingSentTransactionsStatus(mockAddressTestnet))).toBe(
				BtcPendingSentTransactionsStatus.NONE
			);
		});

		it('should return "BtcPendingSentTransactionsStatus.NONE" if there is empty pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: []
			});
			const store = initPendingSentTransactionsStatus(mockAddressMainnet);

			expect(get(store)).toBe(BtcPendingSentTransactionsStatus.NONE);
		});
	});
});
