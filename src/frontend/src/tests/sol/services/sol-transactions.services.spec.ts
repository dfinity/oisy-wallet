import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as solanaApi from '$sol/api/solana.api';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import * as solSignaturesServices from '$sol/services/sol-signatures.services';
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
import { mockSolSignature, mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import {
	createMockSolTransactionsUi,
	mockSolRpcSendTransaction
} from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress, mockSolAddress2, mockSplAddress } from '$tests/mocks/sol.mock';
import * as solProgramToken from '@solana-program/token';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-transactions.services', () => {
	let spyGetTransactions: MockInstance;
	let spyFindAssociatedTokenPda: MockInstance;

	const signalEnd = vi.fn();

	const mockTransactions = createMockSolTransactionsUi(2);

	const mockCertifiedTransactions = mockTransactions.map((transaction) => ({
		data: transaction,
		certified: false
	}));

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.resetAllMocks();

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
		spyGetTransactions = vi.spyOn(solSignaturesServices, 'getSolTransactions');
		spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');
		spyFindAssociatedTokenPda.mockResolvedValue([mockSplAddress]);
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

		const mockValue = 123n;

		const mockMappedTransaction: SolMappedTransaction = {
			value: mockValue,
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
		].reverse();

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

			expect(spyMapSolParsedInstruction).toHaveBeenCalledTimes(3);
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(1, {
				instruction: { ...mockInstructions[0], programAddress: mockInstructions[0].programId },
				innerInstructions: [],
				network,
				cumulativeBalances: {}
			});
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(2, {
				instruction: { ...mockInstructions[1], programAddress: mockInstructions[1].programId },
				innerInstructions: [],
				network,
				cumulativeBalances: {
					[mockSolAddress]: -mockValue,
					[mockSolAddress2]: mockValue
				}
			});
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(3, {
				instruction: { ...mockInstructions[2], programAddress: mockInstructions[2].programId },
				innerInstructions: [],
				network,
				cumulativeBalances: {
					[mockSolAddress]: -mockValue * 2n,
					[mockSolAddress2]: mockValue * 2n
				}
			});
		});

		it('should use inner instructions if presents and/or required', async () => {
			const innerInstructions = [
				{ index: 0, instructions: [mockInstructions[0]] },
				{ index: 1, instructions: [mockInstructions[1]] },
				{ index: 2, instructions: [mockInstructions[2]] }
			];

			const expectedInnerInstructions = innerInstructions
				.flatMap(({ instructions }) => instructions)
				.map((instruction) => ({
					...expected,
					id: `${expected.id}-${instruction.programId}`
				}))
				.reverse();

			spyFetchTransactionDetailForSignature.mockResolvedValue({
				...mockTransactionDetail,
				meta: { innerInstructions }
			});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([
				expectedResults[0],
				expectedInnerInstructions[0],
				expectedResults[1],
				expectedInnerInstructions[1],
				expectedResults[2],
				expectedInnerInstructions[1]
			]);

			expect(spyMapSolParsedInstruction).toHaveBeenCalledTimes(6);
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(1, {
				instruction: {
					...mockInstructions[0],
					programAddress: mockInstructions[0].programId
				},
				innerInstructions: innerInstructions[0].instructions.map((innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				})),
				network,
				cumulativeBalances: {}
			});
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(2, {
				instruction: innerInstructions[0].instructions.map((innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				}))[0],
				innerInstructions: innerInstructions[1].instructions.map((innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				})),
				network,
				cumulativeBalances: {
					[mockSolAddress]: -mockValue,
					[mockSolAddress2]: mockValue
				}
			});
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(3, {
				instruction: {
					...mockInstructions[1],
					programAddress: mockInstructions[1].programId
				},
				innerInstructions: innerInstructions[2].instructions.map((innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				})),
				network,
				cumulativeBalances: {
					[mockSolAddress]: -mockValue * 2n,
					[mockSolAddress2]: mockValue * 2n
				}
			});
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(4, {
				instruction: innerInstructions[1].instructions.map((innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				}))[0],
				innerInstructions: [],
				network,
				cumulativeBalances: {
					[mockSolAddress]: -mockValue * 3n,
					[mockSolAddress2]: mockValue * 3n
				}
			});
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(5, {
				instruction: {
					...mockInstructions[2],
					programAddress: mockInstructions[2].programId
				},
				innerInstructions: [],
				network,
				cumulativeBalances: {
					[mockSolAddress]: -mockValue * 4n,
					[mockSolAddress2]: mockValue * 4n
				}
			});
			expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(6, {
				instruction: innerInstructions[2].instructions.map((innerInstruction) => ({
					...innerInstruction,
					programAddress: innerInstruction.programId
				}))[0],
				innerInstructions: [],
				network,
				cumulativeBalances: {
					[mockSolAddress]: -mockValue * 5n,
					[mockSolAddress2]: mockValue * 5n
				}
			});
		});

		it('should return an empty array if mapped transactions is nullish', async () => {
			spyMapSolParsedInstruction.mockResolvedValue(null);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);

			spyMapSolParsedInstruction.mockResolvedValue(undefined);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
		});

		it('should return only transactions that have mapped transactions non-nullish', async () => {
			const expected = expectedResults.slice(0, -1);

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
				fetchSolTransactionsForSignature({
					...mockParams,
					tokenAddress: mockSplAddress,
					tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
				})
			).resolves.toEqual([]);
			expect(spyFindAssociatedTokenPda).toHaveBeenCalledOnce();
		});

		it('should create a duplicate transaction for self-transfers with opposite type', async () => {
			spyMapSolParsedInstruction.mockResolvedValueOnce({
				...mockMappedTransaction,
				from: mockSolAddress,
				to: mockSolAddress
			});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([
				...expectedResults.slice(0, -1),
				{
					...expected,
					id: `${expected.id}-${mockInstructions[0].programId}-self`,
					type: 'receive',
					from: mockSolAddress,
					to: mockSolAddress
				},
				{ ...expectedResults[expectedResults.length - 1], from: mockSolAddress, to: mockSolAddress }
			]);
		});

		it('should ignore transactions that do not involve the address', async () => {
			spyMapSolParsedInstruction.mockResolvedValueOnce({
				...mockMappedTransaction,
				from: mockSolAddress2,
				to: mockSolAddress2
			});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(
				expectedResults.slice(0, -1)
			);
		});
	});

	describe('loadNextSolTransactions', () => {
		it('should load and return transactions successfully', async () => {
			spyGetTransactions.mockResolvedValue(mockTransactions);

			const transactions = await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			expect(transactions).toEqual(mockCertifiedTransactions);
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
			spyGetTransactions.mockResolvedValue(mockTransactions);

			await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			const storeData = get(solTransactionsStore)?.[SOLANA_TOKEN_ID];
			expect(storeData).toEqual(mockCertifiedTransactions);
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
});
