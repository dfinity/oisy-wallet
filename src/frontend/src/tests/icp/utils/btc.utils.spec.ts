// Hoisted holder for values used/assigned inside the vi.mock factory
interface TxEntry {
	txid: unknown;
}
type StoreValue = Record<string, { certified: true; data: Array<TxEntry> | null }>;
const mockStoreApi = vi.hoisted(() => ({ setStoreValue: (_v: StoreValue) => {} }));

// Mock the btcPendingSentTransactionsStore BEFORE importing the module under test
vi.mock('$btc/stores/btc-pending-sent-transactions.store', async () => {
	const { writable } = await import('svelte/store');
	const store = writable<StoreValue>({});
	// Assign through the hoisted holder instead of touching top-level variables
	mockStoreApi.setStoreValue = (v: StoreValue) => store.set(v);
	return {
		btcPendingSentTransactionsStore: store
	};
});

// Import after mocks
import {
	convertPendingTransactionTxid,
	getPendingTransactionIds,
	getPendingTransactions,
	utxoTxIdToString
} from '$icp/utils/btc.utils';

describe('btc.utils', () => {
	const addr = 'addr1';

	beforeEach(() => {
		mockStoreApi.setStoreValue({});
	});

	describe('utxoTxIdToString', () => {
		it('converts and reverses bytes to hex string', () => {
			const input = new Uint8Array([0x01, 0x02, 0xff]); // reversed: ff0201

			expect(utxoTxIdToString(input)).toBe('ff0201');
		});
	});

	describe('convertPendingTransactionTxid', () => {
		it('converts Uint8Array transaction ID to hex', () => {
			const tx = { txid: new Uint8Array([0x00, 0x01, 0xff]), utxos: [] };

			expect(convertPendingTransactionTxid(tx)).toBe('0001ff');
		});

		it('converts number[] transaction ID to hex', () => {
			const tx = { txid: [15, 255, 1], utxos: [] };

			expect(convertPendingTransactionTxid(tx)).toBe('0fff01');
		});

		it('falls back to string for non-array transaction ID', () => {
			// Cast to simulate the type being unknown at runtime
			const tx = { txid: 'abc123' as unknown as Uint8Array, utxos: [] };

			expect(convertPendingTransactionTxid(tx)).toBe('abc123');
		});

		it('returns null for empty transaction ID', () => {
			const tx = { txid: new Uint8Array([]), utxos: [] };

			expect(convertPendingTransactionTxid(tx)).toBeNull();
		});
	});

	describe('getPendingTransactions', () => {
		it('returns transaction array for address', () => {
			const transactions = [{ txid: [1, 2, 3] }];
			const storeValue: StoreValue = {
				[addr]: { certified: true as const, data: transactions }
			};
			mockStoreApi.setStoreValue(storeValue);

			const result = getPendingTransactions(addr);

			expect(result).toEqual(transactions);
		});

		it('returns null when data is null', () => {
			const storeValue: StoreValue = {
				[addr]: { certified: true as const, data: null }
			};
			mockStoreApi.setStoreValue(storeValue);

			const result = getPendingTransactions(addr);

			expect(result).toBeNull();
		});

		it('returns null when store is empty', () => {
			mockStoreApi.setStoreValue({});

			const result = getPendingTransactions(addr);

			expect(result).toBeNull();
		});

		it('returns empty array when address not in populated store', () => {
			const storeValue: StoreValue = {
				'other-addr': { certified: true as const, data: [{ txid: [1] }] }
			};
			mockStoreApi.setStoreValue(storeValue);

			const result = getPendingTransactions(addr);

			expect(result).toEqual([]);
		});
	});

	describe('getPendingTransactionIds', () => {
		it('returns null when data is null or missing', () => {
			mockStoreApi.setStoreValue({ [addr]: { certified: true as const, data: null } });

			expect(getPendingTransactionIds(addr)).toEqual(null);

			mockStoreApi.setStoreValue({}); // address not present

			expect(getPendingTransactionIds(addr)).toEqual(null);
		});

		it('converts transaction IDs and filters out empty ones', () => {
			mockStoreApi.setStoreValue({
				[addr]: {
					certified: true as const,
					data: [
						{ txid: new Uint8Array([0x01]) }, // '01'
						{ txid: [0xff] }, // 'ff'
						{ txid: new Uint8Array([]) } // -> null, filtered out
					]
				}
			});

			expect(getPendingTransactionIds(addr)).toEqual(['01', 'ff']);
		});
	});
});
