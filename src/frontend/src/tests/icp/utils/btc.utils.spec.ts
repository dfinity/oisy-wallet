// Hoisted holder for values used/assigned inside the vi.mock factory
import { toNullable } from '@dfinity/utils';

interface TxEntry {
	txid: unknown;
	utxos?: Array<{
		value?: bigint;
		outpoint?: {
			txid?: unknown;
			vout?: number;
		};
	}>;
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
	getPendingTransactionIds,
	getPendingTransactionUtxoTxIds,
	getPendingTransactions,
	pendingTransactionTxidToString,
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

	describe('pendingTransactionTxidToString', () => {
		it('converts Uint8Array transaction ID to hex with byte reversal', () => {
			const tx = { txid: new Uint8Array([0x00, 0x01, 0xff]), utxos: [] };

			expect(pendingTransactionTxidToString(tx)).toBe('ff0100');
		});

		it('converts number[] transaction ID to hex with byte reversal', () => {
			const tx = { txid: [15, 255, 1], utxos: [] };

			expect(pendingTransactionTxidToString(tx)).toBe('01ff0f');
		});

		it('returns null for empty transaction ID', () => {
			const tx = { txid: new Uint8Array([]), utxos: [] };

			expect(pendingTransactionTxidToString(tx)).toBeNull();
		});
	});

	describe('getPendingTransactions', () => {
		it('returns transaction array for address', () => {
			const transactions = [{ txid: [1, 2, 3], utxos: [] }];
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
				'other-addr': { certified: true as const, data: [{ txid: toNullable(1) }] }
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

	describe('getPendingTransactionUtxoTxIds', () => {
		it('returns null when data is null or missing', () => {
			mockStoreApi.setStoreValue({ [addr]: { certified: true as const, data: null } });

			expect(getPendingTransactionUtxoTxIds(addr)).toEqual(null);

			mockStoreApi.setStoreValue({}); // address not present

			expect(getPendingTransactionUtxoTxIds(addr)).toEqual(null);
		});

		it('returns empty array when no pending transactions', () => {
			mockStoreApi.setStoreValue({
				[addr]: { certified: true as const, data: [] }
			});

			expect(getPendingTransactionUtxoTxIds(addr)).toEqual([]);
		});

		it('extracts UTXO transaction IDs from pending transactions', () => {
			mockStoreApi.setStoreValue({
				[addr]: {
					certified: true as const,
					data: [
						{
							txid: new Uint8Array([1, 2, 3]), // This is the pending transaction ID
							utxos: [
								{
									value: 100000n,
									outpoint: {
										txid: new Uint8Array([0x01, 0x02, 0x03, 0x04]), // UTXO tx ID
										vout: 0
									}
								},
								{
									value: 200000n,
									outpoint: {
										txid: new Uint8Array([0x05, 0x06, 0x07, 0x08]), // UTXO tx ID
										vout: 1
									}
								}
							]
						}
					]
				}
			});

			const result = getPendingTransactionUtxoTxIds(addr);

			// Should return UTXO transaction IDs (with byte reversal), not the pending transaction ID
			expect(result).toEqual(['04030201', '08070605']);
		});

		it('handles transactions without UTXOs', () => {
			mockStoreApi.setStoreValue({
				[addr]: {
					certified: true as const,
					data: [
						{
							txid: new Uint8Array([1, 2, 3])
							// No utxos property
						},
						{
							txid: new Uint8Array([4, 5, 6]),
							utxos: [] // Empty utxos array
						}
					]
				}
			});

			const result = getPendingTransactionUtxoTxIds(addr);

			expect(result).toEqual([]);
		});
	});
});
