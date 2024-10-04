import { initHasPendingTransactions } from '$btc/derived/has-pending-transactions.derived';
import { pendingTransactionsStore } from '$btc/stores/btc-pending-transactions.store';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import { testnetsStore } from '$lib/stores/settings.store';
import { get } from 'svelte/store';

const mockAddressMainnet = 'mainnet-address';
const mockAddressTestnet = 'testnet-address';
const mockAddressRegtest = 'regtest-address';
const pendingTransactionMock = {
	txid: new Uint8Array([1, 2, 3]),
	utxos: [
		{
			height: 100,
			value: BigInt(5000),
			outpoint: {
				txid: new Uint8Array([1, 2, 3]),
				vout: 0
			}
		}
	]
};

describe('hasPendingTransactions', () => {
	beforeEach(() => {
		btcAddressMainnetStore.reset();
		btcAddressTestnetStore.reset();
		btcAddressRegtestStore.reset();
		pendingTransactionsStore.reset();
		testnetsStore.reset({ key: 'testnets' });
	});

	describe('testnets disabled', () => {
		beforeEach(() => {
			testnetsStore.set({ key: 'testnets', value: { enabled: false } });
		});

		it('should return "loading" if BTC address mainnet is not loaded', () => {
			const store = initHasPendingTransactions(mockAddressMainnet);
			expect(get(store)).toBe('loading');
		});

		it('should return "loading" if pending transactions are not loaded yet for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			const store = initHasPendingTransactions(mockAddressMainnet);
			expect(get(store)).toBe('loading');
		});

		it('should return "false" if address is not the mainnet bitcoin address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			const store = initHasPendingTransactions('another-address');
			expect(get(store)).toBe(false);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			pendingTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: [pendingTransactionMock]
			});
			const store = initHasPendingTransactions(mockAddressMainnet);
			expect(get(store)).toBe(true);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			pendingTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: []
			});
			const store = initHasPendingTransactions(mockAddressMainnet);
			expect(get(store)).toBe(false);
		});
	});

	describe('testnets enabled', () => {
		beforeEach(() => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });
		});

		const loadAllAddresses = () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcAddressTestnetStore.set({ certified: true, data: mockAddressTestnet });
			btcAddressRegtestStore.set({ certified: true, data: mockAddressRegtest });
		};

		it('should return "loading" if some btc address is not loaded', () => {
			expect(get(initHasPendingTransactions(mockAddressMainnet))).toBe('loading');

			btcAddressTestnetStore.set({ certified: true, data: mockAddressMainnet });
			expect(get(initHasPendingTransactions(mockAddressMainnet))).toBe('loading');

			btcAddressTestnetStore.set({ certified: true, data: mockAddressRegtest });
			expect(get(initHasPendingTransactions(mockAddressMainnet))).toBe('loading');

			btcAddressTestnetStore.reset();
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			expect(get(initHasPendingTransactions(mockAddressTestnet))).toBe('loading');
		});

		it('should return "loading" if pending transactions are not loaded yet for the address', () => {
			loadAllAddresses();
			expect(get(initHasPendingTransactions(mockAddressTestnet))).toBe('loading');
			expect(get(initHasPendingTransactions(mockAddressMainnet))).toBe('loading');
		});

		it('should return "false" if address is not a bitcoin address', () => {
			loadAllAddresses();
			expect(get(initHasPendingTransactions('another-address'))).toBe(false);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			loadAllAddresses();
			pendingTransactionsStore.setPendingTransactions({
				address: mockAddressTestnet,
				pendingTransactions: [pendingTransactionMock]
			});
			expect(get(initHasPendingTransactions(mockAddressTestnet))).toBe(true);
		});

		it('should return "false" if pending transactions are present and empty', () => {
			loadAllAddresses();
			pendingTransactionsStore.setPendingTransactions({
				address: mockAddressTestnet,
				pendingTransactions: []
			});
			expect(get(initHasPendingTransactions(mockAddressTestnet))).toBe(false);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			pendingTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: [pendingTransactionMock]
			});
			const store = initHasPendingTransactions(mockAddressMainnet);
			expect(get(store)).toBe(true);
		});

		it('should return "false" if there is empty pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			pendingTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: []
			});
			const store = initHasPendingTransactions(mockAddressMainnet);
			expect(get(store)).toBe(false);
		});
	});
});
