import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as solanaApi from '$sol/api/solana.api';
import {
	fetchSolTransactionsForSignature,
	loadNextSolTransactions
} from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import type {
	SolMappedTransaction,
	SolRpcTransactionRaw,
	SolSignature,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import * as solInstructionsUtils from '$sol/utils/sol-instructions.utils';
import * as solTransactionsUtils from '$sol/utils/sol-transactions.utils';
import { mockSolSignature, mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import {
	mockSolCertifiedTransactions,
	mockSolRpcReceiveTransaction,
	mockSolRpcSendTransaction
} from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress, mockSolAddress2, mockSplAddress } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';
import { vi, type MockInstance } from 'vitest';

vi.mock(import('$sol/services/sol-transactions.services'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getSolTransactions: vi.fn()
	};
});

describe('sol-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.restoreAllMocks();

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
	});

	describe('fetchSolTransactionsForSignature', () => {
		const network: SolanaNetworkType = 'mainnet';
		const mockSignature: SolSignature = mockSolSignatureResponse();
		const mockParams = {
			signature: mockSignature,
			network,
			address: mockSolAddress
		};

		const mockTransactionDetail: SolRpcTransactionRaw = mockSolRpcSendTransaction;

		const mockMappedTransaction: SolMappedTransaction = {
			value: 123n,
			from: mockSolAddress,
			to: mockSolAddress2
		};

		const mockInstructions = mockTransactionDetail.transaction.message.instructions;

		const expected: SolTransactionUi = {
			id: mockSignature.signature,
			signature: mockSignature.signature,
			timestamp: mockTransactionDetail.blockTime ?? 0n,
			value: mockMappedTransaction.value,
			from: mockSolAddress,
			to: mockSolAddress2,
			type: 'send',
			status: mockTransactionDetail.confirmationStatus
		};

		const expectedResults = [
			{ ...expected, id: `${expected.id}-${mockInstructions[0].programId}` },
			{ ...expected, id: `${expected.id}-${mockInstructions[1].programId}` },
			{ ...expected, id: `${expected.id}-${mockInstructions[2].programId}` }
		];

		let spyFetchTransactionDetailForSignature: MockInstance;
		let spyMapSolParsedInstruction: MockInstance;

		beforeEach(() => {
			spyFetchTransactionDetailForSignature = vi.spyOn(
				solanaApi,
				'fetchTransactionDetailForSignature'
			);
			spyFetchTransactionDetailForSignature.mockResolvedValue(mockTransactionDetail);

			spyMapSolParsedInstruction = vi
				.spyOn(solInstructionsUtils, 'mapSolParsedInstruction')
				.mockResolvedValue(mockMappedTransaction);
		});

		it('should return an empty array if transaction detail is nullish', async () => {
			spyFetchTransactionDetailForSignature.mockResolvedValueOnce(null);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);

			spyFetchTransactionDetailForSignature.mockResolvedValueOnce(undefined);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
		});

		it('should return an empty array if there are no instructions', async () => {
			spyFetchTransactionDetailForSignature.mockResolvedValueOnce({
				...mockTransactionDetail,
				transaction: { message: { instructions: [] } }
			});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
		});

		it('should process instructions and return transactions', async () => {
			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(expectedResults);

			expect(spyMapSolParsedInstruction).toHaveBeenCalledWith({
				instruction: { ...mockInstructions[0], programAddress: mockInstructions[0].programId },
				innerInstructions: [],
				network
			});
		});

		it('should use inner instructions if presents and required', async () => {
			const innerInstructions = [
				{ index: 0, instructions: [mockInstructions[0]] },
				{ index: 1, instructions: [mockInstructions[1]] },
				{ index: 2, instructions: [mockInstructions[2]] }
			];

			spyFetchTransactionDetailForSignature.mockResolvedValue({
				...mockTransactionDetail,
				meta: { innerInstructions }
			});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(expectedResults);

			expect(spyMapSolParsedInstruction).toHaveBeenCalledWith({
				instruction: { ...mockInstructions[0], programAddress: mockInstructions[0].programId },
				innerInstructions: innerInstructions[0].instructions.map((innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				})),
				network
			});
		});

		it('should return an empty array if mapped transactions is nullish', async () => {
			spyMapSolParsedInstruction.mockResolvedValue(null);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);

			spyMapSolParsedInstruction.mockResolvedValue(undefined);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
		});

		it('should return only transactions that have mapped transactions non-nullish', async () => {
			const expected = expectedResults.slice(1);

			spyMapSolParsedInstruction.mockResolvedValueOnce(null);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(expected);

			spyMapSolParsedInstruction.mockResolvedValueOnce(undefined);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(expected);
		});

		it('should return an empty array if no mapped transactions match tokenAddress', async () => {
			spyMapSolParsedInstruction.mockResolvedValue({
				...mockMappedTransaction,
				tokenAddress: 'other-token-address'
			});

			await expect(
				fetchSolTransactionsForSignature({ ...mockParams, tokenAddress: mockSplAddress })
			).resolves.toEqual([]);
		});

		it('should create a duplicate transaction for self-transfers with opposite type', async () => {
			spyMapSolParsedInstruction.mockResolvedValueOnce({
				...mockMappedTransaction,
				from: mockSolAddress,
				to: mockSolAddress
			});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([
				{ ...expectedResults[0], from: mockSolAddress, to: mockSolAddress },
				{
					...expected,
					id: `${expected.id}-${mockInstructions[0].programId}-self`,
					type: 'receive',
					from: mockSolAddress,
					to: mockSolAddress
				},
				...expectedResults.slice(1)
			]);
		});
	});

	describe('loadNextSolTransactions', () => {
		let spyMapSolTransactionUi: MockInstance;
		let spyFetchTransactionDetailForSignature: MockInstance;
		let spyGetTransactions: MockInstance;

		const signalEnd = vi.fn();

		const mockTransactions = [mockSolRpcReceiveTransaction, mockSolRpcSendTransaction];

		const mockSolTransactionUi: SolTransactionUi = {
			id: mockSolRpcSendTransaction.signature,
			signature: mockSolRpcSendTransaction.signature,
			timestamp: mockSolRpcSendTransaction.blockTime ?? 0n,
			value: 123n,
			from: mockSolAddress,
			to: mockSolAddress2,
			type: 'send',
			status: mockSolRpcSendTransaction.confirmationStatus
		};

		beforeEach(() => {
			spyMapSolTransactionUi = vi
				.spyOn(solTransactionsUtils, 'mapSolTransactionUi')
				.mockResolvedValueOnce(mockSolTransactionUi)
				.mockResolvedValueOnce({
					...mockSolTransactionUi,
					id: mockSolRpcReceiveTransaction.signature,
					signature: mockSolRpcReceiveTransaction.signature,
					value: 456n,
					from: mockSolAddress2,
					to: mockSolAddress,
					type: 'receive'
				});

			// spyGetTransactions = vi
			// 	.spyOn(solTransactionsServices, 'getSolTransactions')
			// 	.mockResolvedValue(mockTransactions);
		});

		it('should load and return transactions successfully', async () => {
			// spyGetTransactions.mockResolvedValue(mockTransactions);

			const transactions = await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			expect(transactions).toEqual(mockSolCertifiedTransactions);
			expect(signalEnd).not.toHaveBeenCalled();
			expect(spyGetTransactions).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});
		});

		it('should handle pagination parameters', async () => {
			spyGetTransactions.mockResolvedValue(mockTransactions);
			const before = mockSolSignature();
			const limit = 10;

			await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before,
				limit,
				signalEnd
			});

			expect(spyGetTransactions).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before,
				limit
			});
		});

		it('should signal end when no transactions are returned', async () => {
			spyGetTransactions.mockResolvedValue([]);

			const transactions = await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			expect(transactions).toEqual([]);
			expect(signalEnd).toHaveBeenCalled();
		});

		it('should append transactions to the store', async () => {
			spyGetTransactions.mockReturnValue(mockTransactions);

			await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			const storeData = get(solTransactionsStore)?.[SOLANA_TOKEN_ID];
			expect(storeData).toEqual(mockSolCertifiedTransactions);
		});

		it('should handle errors and reset store', async () => {
			vi.spyOn(console, 'error').mockImplementationOnce(() => {});
			const error = new Error('Failed to load transactions');
			spyGetTransactions.mockRejectedValue(error);

			const transactions = await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			expect(transactions).toEqual([]);
			const storeData = get(solTransactionsStore)?.[SOLANA_TOKEN_ID];
			expect(storeData).toBeNull();
		});

		it('should work with different networks', async () => {
			spyGetTransactions.mockResolvedValue(mockTransactions);

			await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.devnet,
				signalEnd
			});

			expect(spyGetTransactions).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.devnet
			});
		});
	});

	describe('getSolTransactions', async () => {
		const { getSolTransactions } = await vi.importActual<
			typeof import('$sol/services/sol-transactions.services')
		>('$sol/services/sol-transactions.services');

		let spyFetchSignatures: MockInstance;
		let spyFetchTransactionDetailForSignature: MockInstance;

		const mockError = new Error('RPC Error');

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			spyFetchSignatures.mockReturnValue([mockSolSignatureResponse(), mockSolSignatureResponse()]);

			spyFetchTransactionDetailForSignature = vi.spyOn(
				solanaApi,
				'fetchTransactionDetailForSignature'
			);
			spyFetchTransactionDetailForSignature.mockResolvedValue(mockSolRpcSendTransaction);
		});

		it('should fetch transactions successfully', async () => {
			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(2);
			expect(spyFetchSignatures).toHaveBeenCalledTimes(1);
			expect(spyFetchTransactionDetailForSignature).toHaveBeenCalledTimes(2);
		});

		it('should handle before parameter', async () => {
			const signature = mockSolSignature();
			await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: signature
			});

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					before: signature
				})
			);
		});

		it('should handle limit parameter', async () => {
			await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 5
				})
			);
		});

		it('should not return transactions that do not change SOL balance', async () => {
			spyFetchTransactionDetailForSignature.mockReturnValue({
				...mockSolRpcSendTransaction,
				meta: {
					...mockSolRpcSendTransaction.meta,
					postBalances: mockSolRpcSendTransaction.meta?.postBalances,
					preBalances: mockSolRpcSendTransaction.meta?.postBalances
				}
			});

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(transactions).toHaveLength(0);
		});

		it('should handle empty signatures response', async () => {
			spyFetchSignatures.mockReturnValue([]);

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
			expect(spyFetchTransactionDetailForSignature).not.toHaveBeenCalled();
		});

		it('should handle null transaction responses', async () => {
			spyFetchSignatures.mockReturnValue([mockSolSignatureResponse()]);
			spyFetchTransactionDetailForSignature.mockReturnValue(null);

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
		});

		it('should handle RPC errors gracefully', async () => {
			spyFetchSignatures.mockRejectedValue(mockError);

			await expect(
				getSolTransactions({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});
	});
});
