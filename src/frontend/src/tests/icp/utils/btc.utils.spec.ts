// eslint-disable-next-line import/order
import { isNullish, toNullable } from '@dfinity/utils';

// Hoisted holder for values used/assigned inside the vi.mock factory
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
import { BTC_BALANCE_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import {
	getBtcWalletBalance,
	getPendingTransactionIds,
	getPendingTransactionUtxoOutpoints,
	getPendingTransactions,
	outpointToKey,
	pendingTransactionTxidToString,
	utxoTxIdToString
} from '$icp/utils/btc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { CertifiedData } from '$lib/types/store';
import { mockBtcTransactionUi } from '$tests/mocks/blockchain-transactions.mock';
import { mockUtxo } from '$tests/mocks/btc.mock';

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
		it('converts Uint8Array with hex transaction ID to hex with byte reversal', () => {
			const tx = { txid: new Uint8Array([0x00, 0x01, 0xff]), utxos: [] };

			expect(pendingTransactionTxidToString(tx)).toBe('ff0100');
		});

		it('converts Uint8Array with number transaction ID to hex with byte reversal', () => {
			const tx = { txid: Uint8Array.from([15, 255, 1]), utxos: [] };

			expect(pendingTransactionTxidToString(tx)).toBe('01ff0f');
		});

		it('returns null for empty transaction ID', () => {
			const tx = { txid: new Uint8Array([]), utxos: [] };

			expect(pendingTransactionTxidToString(tx)).toBeNull();
		});
	});

	describe('getBtcWalletBalance', () => {
		// The user holds two 2000-sat UTXOs and sends 1000 with a 100-sat fee. The send spends one
		// whole UTXO and returns 900 as change, so the user ends up with 2900 either way.
		const utxoValue = 2_000n;
		const heldBalance = utxoValue * 2n;
		const sent = 1_000n;
		const fee = 100n;
		const afterSend = 2_900n;

		const pendingSend: PendingTransaction = {
			txid: Uint8Array.from([9, 9, 9]),
			utxos: [{ ...mockUtxo, value: utxoValue }]
		};

		// The pending send as the provider reports it, at a given depth.
		const providerSend = (confirmations?: number): CertifiedData<BtcTransactionUi> => ({
			data: {
				...mockBtcTransactionUi,
				id: utxoTxIdToString(pendingSend.txid),
				type: 'send',
				value: sent,
				fee,
				confirmations,
				status: isNullish(confirmations) ? 'pending' : 'unconfirmed'
			},
			certified: false
		});

		it('deducts only the net outflow while the send is in the mempool', () => {
			// `balance` still counts the whole spent UTXO and cannot see the change yet.
			expect(
				getBtcWalletBalance({
					balance: heldBalance,
					providerTransactions: [providerSend()],
					pendingTransactions: [pendingSend]
				})
			).toEqual({
				confirmed: afterSend,
				unconfirmed: ZERO,
				locked: sent + fee,
				total: afterSend
			});
		});

		it('deducts nothing once the send is in a block', () => {
			// `balance` now excludes the spent UTXO and counts the change, while the backend keeps
			// reporting the reservation until the send is 6 blocks deep.
			expect(
				getBtcWalletBalance({
					balance: afterSend,
					providerTransactions: [providerSend(BTC_BALANCE_MIN_CONFIRMATIONS)],
					pendingTransactions: [pendingSend]
				})
			).toEqual({
				confirmed: afterSend,
				unconfirmed: ZERO,
				locked: ZERO,
				total: afterSend
			});
		});

		it('does not depend on how many UTXOs the send selected', () => {
			// The same send funded from both UTXOs: a bigger change, an identical outflow.
			expect(
				getBtcWalletBalance({
					balance: heldBalance,
					providerTransactions: [providerSend()],
					pendingTransactions: [
						{
							...pendingSend,
							utxos: [
								{ ...mockUtxo, value: utxoValue },
								{ ...mockUtxo, value: utxoValue }
							]
						}
					]
				}).confirmed
			).toBe(afterSend);
		});

		it('falls back to the reserved inputs when the provider has not seen the send', () => {
			// Without the provider's outputs the change is unknowable, so the whole input is written
			// off — under-reporting by the change until the provider catches up.
			expect(
				getBtcWalletBalance({
					balance: heldBalance,
					providerTransactions: [],
					pendingTransactions: [pendingSend]
				})
			).toEqual({
				confirmed: utxoValue,
				unconfirmed: ZERO,
				locked: utxoValue,
				total: utxoValue
			});
		});

		it('counts an incoming mempool transaction as unconfirmed', () => {
			expect(
				getBtcWalletBalance({
					balance: heldBalance,
					providerTransactions: [
						{
							data: { ...mockBtcTransactionUi, status: 'pending', type: 'receive', value: 50n },
							certified: false
						}
					]
				})
			).toEqual({
				confirmed: heldBalance,
				unconfirmed: 50n,
				locked: ZERO,
				total: heldBalance + 50n
			});
		});

		it('does not count an incoming transaction that is already in a block', () => {
			// `balance` contains it at BTC_BALANCE_MIN_CONFIRMATIONS, so counting it again would
			// inflate `total`.
			expect(
				getBtcWalletBalance({
					balance: heldBalance,
					providerTransactions: [
						{
							data: {
								...mockBtcTransactionUi,
								status: 'unconfirmed',
								type: 'receive',
								confirmations: 3,
								value: 50n
							},
							certified: false
						}
					]
				})
			).toEqual({
				confirmed: heldBalance,
				unconfirmed: ZERO,
				locked: ZERO,
				total: heldBalance
			});
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

	describe('outpointToKey', () => {
		it('encodes a (txid, vout) pair as `${reversed-txid-hex}:${vout}`', () => {
			expect(outpointToKey({ txid: new Uint8Array([0x01, 0x02, 0x03, 0x04]), vout: 0 })).toBe(
				'04030201:0'
			);
			expect(outpointToKey({ txid: new Uint8Array([0x01, 0x02, 0x03, 0x04]), vout: 7 })).toBe(
				'04030201:7'
			);
		});
	});

	describe('getPendingTransactionUtxoOutpoints', () => {
		it('returns null when data is null or missing', () => {
			mockStoreApi.setStoreValue({ [addr]: { certified: true as const, data: null } });

			expect(getPendingTransactionUtxoOutpoints(addr)).toEqual(null);

			mockStoreApi.setStoreValue({}); // address not present

			expect(getPendingTransactionUtxoOutpoints(addr)).toEqual(null);
		});

		it('returns empty array when no pending transactions', () => {
			mockStoreApi.setStoreValue({
				[addr]: { certified: true as const, data: [] }
			});

			expect(getPendingTransactionUtxoOutpoints(addr)).toEqual([]);
		});

		it('extracts outpoint keys from pending transactions', () => {
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
										txid: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
										vout: 0
									}
								},
								{
									value: 200000n,
									outpoint: {
										txid: new Uint8Array([0x05, 0x06, 0x07, 0x08]),
										vout: 1
									}
								}
							]
						}
					]
				}
			});

			const result = getPendingTransactionUtxoOutpoints(addr);

			// Outpoints are reversed-txid-hex + vout, never the pending tx id itself
			expect(result).toEqual(['04030201:0', '08070605:1']);
		});

		it('keeps UTXOs with the same txid but different vout as distinct outpoints', () => {
			mockStoreApi.setStoreValue({
				[addr]: {
					certified: true as const,
					data: [
						{
							txid: new Uint8Array([9]),
							utxos: [
								{
									value: 100000n,
									outpoint: {
										txid: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
										vout: 0
									}
								},
								{
									value: 200000n,
									outpoint: {
										txid: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
										vout: 1
									}
								}
							]
						}
					]
				}
			});

			expect(getPendingTransactionUtxoOutpoints(addr)).toEqual(['04030201:0', '04030201:1']);
		});

		it('deduplicates identical outpoints across multiple pending transactions', () => {
			mockStoreApi.setStoreValue({
				[addr]: {
					certified: true as const,
					data: [
						{
							txid: new Uint8Array([1]),
							utxos: [
								{
									value: 100000n,
									outpoint: { txid: new Uint8Array([0xaa]), vout: 0 }
								}
							]
						},
						{
							txid: new Uint8Array([2]),
							utxos: [
								{
									value: 100000n,
									outpoint: { txid: new Uint8Array([0xaa]), vout: 0 }
								}
							]
						}
					]
				}
			});

			expect(getPendingTransactionUtxoOutpoints(addr)).toEqual(['aa:0']);
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

			const result = getPendingTransactionUtxoOutpoints(addr);

			expect(result).toEqual([]);
		});
	});
});
