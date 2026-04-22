import {
	BTC_MAINNET_EXPLORER_URL,
	BTC_TESTNET_EXPLORER_URL,
	CKBTC_EXPLORER_URL,
	CKBTC_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { MINT_MEMO_KYT_FAIL } from '$icp/utils/ckbtc-memo.utils';
import {
	extendCkBTCTransaction,
	getCkBtcPendingUtxoTransactions,
	mapCkBTCPendingUtxo,
	mapCkBTCTransaction
} from '$icp/utils/ckbtc-transactions.utils';
import { mockPendingUtxo } from '$tests/mocks/ckbtc.mock';
import {
	MOCK_CKBTC_TOKEN,
	cleanupCkBtcPendingStores,
	createMockIcrcBurnTransaction,
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction,
	setupCkBtcPendingStores
} from '$tests/mocks/ic-transactions.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { Cbor } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

describe('ckbtc-transactions.utils', () => {
	describe('mapCkBTCTransaction', () => {
		const baseMockTransaction = createMockIcrcTransferTransaction();

		it('should map a basic transfer transaction with ckBTC explorer URLs', () => {
			const result = mapCkBTCTransaction({
				transaction: baseMockTransaction,
				identity: undefined,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				env: 'mainnet'
			});

			expect(result.id).toBe('100');
			expect(result.txExplorerUrl).toContain(CKBTC_EXPLORER_URL);
		});

		it('should use testnet ckBTC explorer URL for testnet env', () => {
			const result = mapCkBTCTransaction({
				transaction: baseMockTransaction,
				identity: undefined,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				env: 'testnet'
			});

			expect(result.txExplorerUrl).toContain(CKBTC_TESTNET_EXPLORER_URL);
		});

		it('should not include ckBTC explorer URLs for unknown ledger', () => {
			const result = mapCkBTCTransaction({
				transaction: baseMockTransaction,
				identity: undefined,
				ledgerCanisterId: 'unknown-canister-id',
				env: 'mainnet'
			});

			expect(result.txExplorerUrl).toBeUndefined();
		});

		it('should not include ckBTC explorer URLs when env is undefined', () => {
			const result = mapCkBTCTransaction({
				transaction: baseMockTransaction,
				identity: undefined,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				env: undefined
			});

			expect(result.txExplorerUrl).toBeUndefined();
		});

		describe('mint transactions', () => {
			it('should map a mint transaction as a plain receive', () => {
				const result = mapCkBTCTransaction({
					transaction: createMockIcrcMintTransaction(),
					identity: undefined,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.fromLabel).toBeUndefined();
				expect(result.typeLabel).toBe('receive.text.receive');
				expect(result.status).toBe('executed');
			});

			it('should map a reimbursement mint transaction', () => {
				const kytFailMemo = new Uint8Array(Cbor.encode([MINT_MEMO_KYT_FAIL, [null, null, null]]));

				const result = mapCkBTCTransaction({
					transaction: createMockIcrcMintTransaction({ id: 201n, memo: kytFailMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.typeLabel).toBe('transaction.label.reimbursement');
				expect(result.status).toBe('reimbursed');
			});
		});

		describe('burn transactions', () => {
			it('should map a burn transaction with BTC address from memo', () => {
				const burnMemo = new Uint8Array(Cbor.encode([0, ['bc1qtest123', null, null]]));

				const result = mapCkBTCTransaction({
					transaction: createMockIcrcBurnTransaction({ memo: burnMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.to).toBe('bc1qtest123');
				expect(result.toExplorerUrl).toContain(BTC_MAINNET_EXPLORER_URL);
				expect(result.toExplorerUrl).toContain('bc1qtest123');
			});

			it('should use testnet BTC explorer URL for non-mainnet canister', () => {
				const burnMemo = new Uint8Array(Cbor.encode([0, ['tb1qtest456', null, null]]));

				const result = mapCkBTCTransaction({
					transaction: createMockIcrcBurnTransaction({ id: 301n, memo: burnMemo }),
					identity: undefined,
					ledgerCanisterId: 'testnet-canister-id',
					env: 'testnet'
				});

				expect(result.toExplorerUrl).toContain(BTC_TESTNET_EXPLORER_URL);
			});

			it('should set toLabel to twin_network when memo has no address', () => {
				const result = mapCkBTCTransaction({
					transaction: createMockIcrcBurnTransaction({ id: 302n }),
					identity: undefined,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.toLabel).toBe('transaction.label.twin_network');
			});
		});
	});

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
			| { Confirmed: { txid: Uint8Array } }
			| { Sending: { txid: Uint8Array } }
			| { AmountTooLow: null }
			| { WillReimburse: CkBtcMinterDid.ReimbursementRequest }
			| { Unknown: null }
			| { Submitted: { txid: Uint8Array } }
			| { Reimbursed: CkBtcMinterDid.ReimbursedDeposit }
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
							typeLabel: 'send.text.send',
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
						typeLabel: 'send.text.send',
						status: 'executed'
					}
				});
			});
		});
	});

	describe('getCkBtcPendingUtxoTransactions', () => {
		it('should return empty array when no pending transactions', () => {
			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toHaveLength(0);
		});

		it('should return the pending transactions', () => {
			setupCkBtcPendingStores();

			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN,
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

			ckBtcMinterInfoStore.reset(MOCK_CKBTC_TOKEN.id);

			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toStrictEqual([]);

			cleanupCkBtcPendingStores();
		});

		it('should not return the pending transactions when utxos store is not available', () => {
			setupCkBtcPendingStores();

			ckBtcPendingUtxosStore.reset(MOCK_CKBTC_TOKEN.id);

			const result = getCkBtcPendingUtxoTransactions({
				token: MOCK_CKBTC_TOKEN,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			});

			expect(result).toStrictEqual([]);

			cleanupCkBtcPendingStores();
		});
	});
});
