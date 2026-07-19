import {
	CKETH_EXPLORER_URL,
	CKETH_SEPOLIA_EXPLORER_URL,
	ETHEREUM_EXPLORER_URL
} from '$env/explorers.env';
import {
	IC_CKETH_LEDGER_CANISTER_ID,
	STAGING_CKETH_LEDGER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { ICRC_LEDGER_CANISTER_TESTNET_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.testnet.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import {
	MINT_MEMO_CONVERT,
	MINT_MEMO_REIMBURSE_TRANSACTION,
	MINT_MEMO_REIMBURSE_WITHDRAWAL
} from '$icp/utils/cketh-memo.utils';
import {
	getCkEthPendingTransactions,
	mapCkEthereumTransaction
} from '$icp/utils/cketh-transactions.utils';
import type { Token } from '$lib/types/token';
import {
	MOCK_CKETH_TOKEN,
	cleanupCkEthPendingStore,
	createMockIcrcBurnTransaction,
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction,
	setupCkEthPendingStore
} from '$tests/mocks/ic-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { Cbor } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

describe('cketh-transactions.utils', () => {
	describe('mapCkEthereumTransaction', () => {
		const mockTransaction = createMockIcrcTransferTransaction({ id: 123456n, amount: 100000000n });

		it('should return correct explorer URLs for ckETH environment', () => {
			const result = mapCkEthereumTransaction({
				transaction: mockTransaction,
				identity: undefined,
				ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
				env: 'mainnet'
			});

			expect(result.txExplorerUrl).toMatch(new RegExp(`^${CKETH_EXPLORER_URL}`));
		});

		it('should return correct explorer URLs for ckSepoliaETH', () => {
			assertNonNullish(STAGING_CKETH_LEDGER_CANISTER_ID);

			const result = mapCkEthereumTransaction({
				transaction: mockTransaction,
				identity: undefined,
				ledgerCanisterId: STAGING_CKETH_LEDGER_CANISTER_ID.toString(),
				env: 'mainnet'
			});

			expect(result.txExplorerUrl).toMatch(new RegExp(`^${CKETH_SEPOLIA_EXPLORER_URL}`));
		});

		describe('mint transactions', () => {
			it('should map a regular mint as a plain receive', () => {
				const fromAddress = new Uint8Array(20).fill(0xab);
				const txHash = new Uint8Array(32).fill(0xcd);
				const convertMemo = new Uint8Array(
					Cbor.encode([MINT_MEMO_CONVERT, [txHash, fromAddress, 12345]])
				);

				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcMintTransaction({ id: 500n, memo: convertMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.typeLabel).toBe('receive.text.receive');
				expect(result.status).toBe('executed');
				expect(result.from).toBeDefined();
				expect(result.fromExplorerUrl).toContain(ETHEREUM_EXPLORER_URL);
			});

			it('should map a reimbursement mint (REIMBURSE_TRANSACTION)', () => {
				const fromAddress = new Uint8Array(20).fill(0xef);
				const reimburseMemo = new Uint8Array(
					Cbor.encode([MINT_MEMO_REIMBURSE_TRANSACTION, [42, fromAddress]])
				);

				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcMintTransaction({ id: 501n, memo: reimburseMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.typeLabel).toBe('transaction.label.reimbursement');
				expect(result.status).toBe('reimbursed');
			});

			it('should map a reimbursement withdrawal mint', () => {
				const reimburseMemo = new Uint8Array(Cbor.encode([MINT_MEMO_REIMBURSE_WITHDRAWAL, [99]]));

				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcMintTransaction({ id: 502n, memo: reimburseMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.typeLabel).toBe('transaction.label.reimbursement');
				expect(result.status).toBe('reimbursed');
			});

			it('should fall back to a plain receive when memo decoding fails', () => {
				const invalidMemo = new Uint8Array([0xff, 0xff]);

				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcMintTransaction({ id: 503n, memo: invalidMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.fromLabel).toBeUndefined();
				expect(result.typeLabel).toBe('receive.text.receive');
			});

			it('should fall back to a plain receive for a mint without memo', () => {
				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcMintTransaction({ id: 504n }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.fromLabel).toBeUndefined();
				expect(result.typeLabel).toBe('receive.text.receive');
				expect(result.status).toBe('executed');
			});

			it('should use Sepolia explorer for testnet ledger IDs', () => {
				const [testnetLedgerId] = ICRC_LEDGER_CANISTER_TESTNET_IDS;

				if (!testnetLedgerId) {
					return;
				}

				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcMintTransaction({ id: 505n }),
					identity: undefined,
					ledgerCanisterId: testnetLedgerId,
					env: 'mainnet'
				});

				expect(result.txExplorerUrl).toContain(CKETH_SEPOLIA_EXPLORER_URL);
			});
		});

		describe('burn transactions', () => {
			it('should map a burn transaction with decoded ETH address', () => {
				const toAddress = new Uint8Array(20).fill(0xab);
				const burnMemo = new Uint8Array(Cbor.encode([0, [toAddress]]));

				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcBurnTransaction({ id: 600n, memo: burnMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.typeLabel).toBe('send.text.send');
				expect(result.to).toBeDefined();
				expect(result.toExplorerUrl).toContain(ETHEREUM_EXPLORER_URL);
			});

			it('should set toLabel to twin_network when memo decoding fails', () => {
				const invalidMemo = new Uint8Array([0xff, 0xff]);

				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcBurnTransaction({ id: 601n, memo: invalidMemo }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.toLabel).toBe('transaction.label.twin_network');
			});

			it('should set toLabel to twin_network for a burn with empty memo', () => {
				const result = mapCkEthereumTransaction({
					transaction: createMockIcrcBurnTransaction({ id: 602n }),
					identity: undefined,
					ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
					env: 'mainnet'
				});

				expect(result.toLabel).toBe('transaction.label.twin_network');
			});
		});
	});

	describe('getCkEthPendingTransactions', () => {
		it('should return empty array when no pending transactions', () => {
			const result = getCkEthPendingTransactions({
				token: MOCK_CKETH_TOKEN as Token,
				icPendingTransactionsStore: get(icPendingTransactionsStore)
			});

			expect(result).toHaveLength(0);
		});

		it('should return the pending transactions', () => {
			setupCkEthPendingStore();

			const result = getCkEthPendingTransactions({
				token: MOCK_CKETH_TOKEN as Token,
				icPendingTransactionsStore: get(icPendingTransactionsStore)
			});

			expect(result).toHaveLength(2);

			cleanupCkEthPendingStore();
		});

		it('should not return the pending transactions for wrong token', () => {
			setupCkEthPendingStore();

			const result = getCkEthPendingTransactions({
				token: ICP_TOKEN,
				icPendingTransactionsStore: get(icPendingTransactionsStore)
			});

			expect(result).toHaveLength(0);

			cleanupCkEthPendingStore();
		});
	});
});
