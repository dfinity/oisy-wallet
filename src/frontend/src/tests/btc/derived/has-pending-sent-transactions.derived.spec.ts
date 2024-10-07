import { initHasPendingSentTransactions } from '$btc/derived/has-pending-sent-transactions.derived';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
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

describe('initHasPendingSentTransactions', () => {
	beforeEach(() => {
		btcAddressMainnetStore.reset();
		btcAddressTestnetStore.reset();
		btcAddressRegtestStore.reset();
		btcPendingSentTransactionsStore.reset();
		testnetsStore.reset({ key: 'testnets' });
	});

	describe('testnets disabled', () => {
		beforeEach(() => {
			testnetsStore.set({ key: 'testnets', value: { enabled: false } });
		});

		it('should return "loading" if BTC address mainnet is not loaded', () => {
			const store = initHasPendingSentTransactions(mockAddressMainnet);
			expect(get(store)).toBe('loading');
		});

		it('should return "loading" if pending transactions are not loaded yet for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			const store = initHasPendingSentTransactions(mockAddressMainnet);
			expect(get(store)).toBe('loading');
		});

		it('should return "error" if pending transactions are not `null` for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactionsError({ address: mockAddressMainnet });
			const store = initHasPendingSentTransactions(mockAddressMainnet);
			expect(get(store)).toBe('error');
		});

		it('should return "false" if address is not the mainnet bitcoin address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			const store = initHasPendingSentTransactions('another-address');
			expect(get(store)).toBe(false);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: [pendingTransactionMock]
			});
			const store = initHasPendingSentTransactions(mockAddressMainnet);
			expect(get(store)).toBe(true);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: []
			});
			const store = initHasPendingSentTransactions(mockAddressMainnet);
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
			expect(get(initHasPendingSentTransactions(mockAddressMainnet))).toBe('loading');

			btcAddressTestnetStore.set({ certified: true, data: mockAddressMainnet });
			expect(get(initHasPendingSentTransactions(mockAddressMainnet))).toBe('loading');

			btcAddressTestnetStore.set({ certified: true, data: mockAddressRegtest });
			expect(get(initHasPendingSentTransactions(mockAddressMainnet))).toBe('loading');

			btcAddressTestnetStore.reset();
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			expect(get(initHasPendingSentTransactions(mockAddressTestnet))).toBe('loading');
		});

		it('should return "loading" if pending transactions are not loaded yet for the address', () => {
			loadAllAddresses();
			expect(get(initHasPendingSentTransactions(mockAddressTestnet))).toBe('loading');
			expect(get(initHasPendingSentTransactions(mockAddressMainnet))).toBe('loading');
		});

		it('should return "error" if pending transactions are `null`', () => {
			loadAllAddresses();
			btcPendingSentTransactionsStore.setPendingTransactionsError({ address: mockAddressTestnet });
			expect(get(initHasPendingSentTransactions(mockAddressTestnet))).toBe('error');
			btcPendingSentTransactionsStore.setPendingTransactionsError({ address: mockAddressMainnet });
			expect(get(initHasPendingSentTransactions(mockAddressMainnet))).toBe('error');
		});

		it('should return "false" if address is not a bitcoin address', () => {
			loadAllAddresses();
			expect(get(initHasPendingSentTransactions('another-address'))).toBe(false);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			loadAllAddresses();
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressTestnet,
				pendingTransactions: [pendingTransactionMock]
			});
			expect(get(initHasPendingSentTransactions(mockAddressTestnet))).toBe(true);
		});

		it('should return "false" if pending transactions are present and empty', () => {
			loadAllAddresses();
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressTestnet,
				pendingTransactions: []
			});
			expect(get(initHasPendingSentTransactions(mockAddressTestnet))).toBe(false);
		});

		it('should return "true" if there are pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: [pendingTransactionMock]
			});
			const store = initHasPendingSentTransactions(mockAddressMainnet);
			expect(get(store)).toBe(true);
		});

		it('should return "false" if there is empty pending transactions for the address', () => {
			btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockAddressMainnet,
				pendingTransactions: []
			});
			const store = initHasPendingSentTransactions(mockAddressMainnet);
			expect(get(store)).toBe(false);
		});
	});
});
