import { BTC_MAINNET_EXPLORER_URL, BTC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import {
	extendCkBTCTransaction,
	getCkBtcPendingUtxoTransactions,
	mapCkBTCPendingUtxo
} from '$icp/utils/ckbtc-transactions.utils';
import type { Token } from '$lib/types/token';
import { mockPendingUtxo } from '$tests/mocks/ckbtc.mock';
import {
	MOCK_CKBTC_TOKEN,
	cleanupCkBtcPendingStores,
	setupCkBtcPendingStores
} from '$tests/mocks/ic-transactions.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import type { ReimbursedDeposit, ReimbursementRequest } from '@dfinity/ckbtc/dist/candid/minter';
import { get } from 'svelte/store';

describe('ckbtc-transactions.utils', () => {
	describe('mapCkBTCPendingUtxo', () => {
		const mockKytFee = 123456789n;

		const mockId = utxoTxIdToString(mockPendingUtxo.outpoint.txid);

		it('should map correctly a pending UTXO transaction for mainnet', () => {
			expect(
				mapCkBTCPendingUtxo({
					utxo: mockPendingUtxo,
					kytFee: mockKytFee,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
				})
			).toStrictEqual({
				id: `${mockId}-${mockPendingUtxo.outpoint.vout}`,
				incoming: true,
				type: 'receive',
				status: 'pending',
				fromLabel: 'transaction.label.twin_network',
				typeLabel: 'transaction.label.converting_twin_token',
				value: mockPendingUtxo.value - mockKytFee,
				txExplorerUrl: `${BTC_MAINNET_EXPLORER_URL}/tx/${mockId}`
			});
		});

		it('should map correctly a pending UTXO transaction for testnet', () => {
			expect(
				mapCkBTCPendingUtxo({
					utxo: mockPendingUtxo,
					kytFee: mockKytFee,
					ledgerCanisterId: 'mock-ledger-canister-id'
				})
			).toStrictEqual({
				id: `${mockId}-${mockPendingUtxo.outpoint.vout}`,
				incoming: true,
				type: 'receive',
				status: 'pending',
				fromLabel: 'transaction.label.twin_network',
				typeLabel: 'transaction.label.converting_twin_token',
				value: mockPendingUtxo.value - mockKytFee,
				txExplorerUrl: `${BTC_TESTNET_EXPLORER_URL}/tx/${mockId}`
			});
		});
	});

	describe('extendCkBTCTransaction', () => {
		const mockTransaction: IcCertifiedTransaction = createCertifiedIcTransactionUiMock('123');

		type RetrieveBtcStatusV2 =
			| { Signing: null }
			| { Confirmed: { txid: Uint8Array | number[] } }
			| { Sending: { txid: Uint8Array | number[] } }
			| { AmountTooLow: null }
			| { WillReimburse: ReimbursementRequest }
			| { Unknown: null }
			| { Submitted: { txid: Uint8Array | number[] } }
			| { Reimbursed: ReimbursedDeposit }
			| { Pending: null };

		const mockBtcStatuses: BtcStatusesData = {
			certified: false,
			data: { [mockTransaction.data.id]: { Unknown: null } }
		};

		it('should return the same transaction if it is not a burn transaction', () => {
			expect(
				extendCkBTCTransaction({ transaction: mockTransaction, btcStatuses: undefined })
			).toStrictEqual(mockTransaction);

			expect(
				extendCkBTCTransaction({ transaction: mockTransaction, btcStatuses: mockBtcStatuses })
			).toStrictEqual(mockTransaction);
		});

		describe('when the transaction is a burn transaction', () => {
			it.each(['Reimbursed', 'AmountTooLow'])(
				`should return a failed status for %s status`,
				(status) => {
					const mockBurnTransaction: IcCertifiedTransaction = {
						...mockTransaction,
						data: { ...mockTransaction.data, type: 'burn' }
					};

					const btcStatuses: BtcStatusesData = {
						certified: false,
						data: { [mockBurnTransaction.data.id]: { [status]: null } as RetrieveBtcStatusV2 }
					};

					const result = extendCkBTCTransaction({
						transaction: mockBurnTransaction,
						btcStatuses
					});

					expect(result).toStrictEqual({
						...mockBurnTransaction,
						data: {
							...mockBurnTransaction.data,
							typeLabel: 'transaction.label.sending_twin_token_failed',
							status: 'failed'
						}
					});
				}
			);

			it.each(['Pending', 'Signing', 'Sending', 'Submitted', 'WillReimburse'])(
				`should return a pending status for %s status`,
				(status) => {
					const mockBurnTransaction: IcCertifiedTransaction = {
						...mockTransaction,
						data: { ...mockTransaction.data, type: 'burn' }
					};

					const btcStatuses: BtcStatusesData = {
						certified: false,
						data: { [mockBurnTransaction.data.id]: { [status]: null } as RetrieveBtcStatusV2 }
					};

					const result = extendCkBTCTransaction({
						transaction: mockBurnTransaction,
						btcStatuses
					});

					expect(result).toStrictEqual({
						...mockBurnTransaction,
						data: {
							...mockBurnTransaction.data,
							typeLabel: 'transaction.label.sending_twin_token',
							status: 'pending'
						}
					});
				}
			);

			it.each(['Confirmed', 'Unknown'])(
				`should return an executed status for %s status`,
				(status) => {
					const mockBurnTransaction: IcCertifiedTransaction = {
						...mockTransaction,
						data: { ...mockTransaction.data, type: 'burn' }
					};

					const btcStatuses: BtcStatusesData = {
						certified: false,
						data: { [mockBurnTransaction.data.id]: { [status]: null } as RetrieveBtcStatusV2 }
					};

					const result = extendCkBTCTransaction({
						transaction: mockBurnTransaction,
						btcStatuses
					});

					expect(result).toStrictEqual({
						...mockBurnTransaction,
						data: {
							...mockBurnTransaction.data,
							typeLabel: 'transaction.label.twin_token_sent',
							status: 'executed'
						}
					});
				}
			);

			it('should handle undefined statuses', () => {
				const mockBurnTransaction: IcCertifiedTransaction = {
					...mockTransaction,
					data: { ...mockTransaction.data, type: 'burn' }
				};

				const result = extendCkBTCTransaction({
					transaction: mockBurnTransaction,
					btcStatuses: undefined
				});

				expect(result).toStrictEqual({
					...mockBurnTransaction,
					data: {
						...mockBurnTransaction.data,
						typeLabel: 'transaction.label.twin_token_sent',
						status: 'executed'
					}
				});
			});
		});
	});

	describe('getCkBtcPendingUtxoTransactions', () => {
		it('should return empty array when no pending transactions', () => {
			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN as Token,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toHaveLength(0);
		});

		it('should return the pending transactions', () => {
			setupCkBtcPendingStores();

			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN as Token,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toHaveLength(1);

			cleanupCkBtcPendingStores();
		});

		it('should not return the pending transactions for wrong token', () => {
			setupCkBtcPendingStores();

			const result = getCkBtcPendingUtxoTransactions({
				token: ICP_TOKEN,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toHaveLength(0);

			cleanupCkBtcPendingStores();
		});

		it('should not return the pending transactions when minter info is not available', () => {
			setupCkBtcPendingStores();

			ckBtcMinterInfoStore.reset((MOCK_CKBTC_TOKEN as Token).id);

			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN as Token,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toStrictEqual([]);

			cleanupCkBtcPendingStores();
		});

		it('should not return the pending transactions when utxos store is not available', () => {
			setupCkBtcPendingStores();

			ckBtcPendingUtxosStore.reset((MOCK_CKBTC_TOKEN as Token).id);

			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN as Token,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toStrictEqual([]);

			cleanupCkBtcPendingStores();
		});
	});
});
