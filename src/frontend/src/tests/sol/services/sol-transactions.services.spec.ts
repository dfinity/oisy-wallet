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
	SolRpcTransaction,
	SolSignature,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import * as solInstructionsUtils from '$sol/utils/sol-instructions.utils';
import { mockSolSignature, mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import {
	createMockSolTransactionsUi,
	mockSolTransactionDetail
} from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2,
	mockSplAddress
} from '$tests/mocks/sol.mock';
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

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
		spyGetTransactions = vi.spyOn(solSignaturesServices, 'getSolTransactions');
		spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');
		spyFindAssociatedTokenPda.mockResolvedValue([mockSplAddress]);
	});

	describe('fetchSolTransactionsForSignature', () => {
		const network: SolanaNetworkType = 'mainnet';

		const mockTransactionDetail: SolRpcTransaction = mockSolTransactionDetail;

		const mockTransactionDetailOnlyInnerInstructions: SolRpcTransaction = {
			...mockTransactionDetail,
			transaction: {
				...mockTransactionDetail.transaction,
				message: { ...mockTransactionDetail.transaction.message, instructions: [] }
			}
		} as SolRpcTransaction;

		const mockSignature: SolSignature = {
			...mockSolSignatureResponse(),
			signature: mockSolTransactionDetail.signature
		};

		const mockParams = {
			signature: mockSignature,
			network,
			address: mockSolAddress
		};

		const mockValue = 123n;

		const mockMappedTransaction: SolMappedTransaction = {
			value: mockValue,
			from: mockSolAddress,
			to: mockSolAddress2
		};

		const mockInstructions = mockTransactionDetail.transaction.message.instructions;
		const mockInnerInstructions = mockTransactionDetail.meta?.innerInstructions ?? [];
		// const mockAllInstructions = [...mockInstructions, ...mockInnerInstructionsRaw.flatMap(({ instructions }) => instructions)];
		const { allInstructions: mockAllInstructions } = [...mockInnerInstructions]
			.sort((a, b) => a.index - b.index)
			.reduce(
				({ allInstructions, offset }, { index, instructions }) => {
					const insertIndex = index + offset + 1;
					allInstructions.splice(insertIndex, 0, ...instructions);
					return { allInstructions, offset: offset + instructions.length };
				},
				{ allInstructions: [...mockInstructions], offset: 0 }
			);
		const nInstructions = mockAllInstructions.length;

		const expected: SolTransactionUi = {
			id: mockSignature.signature,
			signature: mockSignature.signature,
			timestamp: mockTransactionDetail.blockTime ?? 0n,
			value: mockMappedTransaction.value,
			from: mockSolAddress,
			to: mockSolAddress2,
			type: 'send',
			status: mockTransactionDetail.confirmationStatus,
			fee: mockTransactionDetail.meta?.fee
		};

		const indexStartAtaMapping = Math.floor(mockAllInstructions.length / 3);

		const expectedResults: SolTransactionUi[] = Array.from(
			{ length: nInstructions },
			(_, index) => ({
				...expected,
				id: `${expected.id}-${index}-${mockAllInstructions[index].programId}`
			})
		).reverse();

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

		it('should return an empty array if there are no instructions nor inner instructions', async () => {
			spyFetchTransactionDetailForSignature.mockResolvedValueOnce({
				...mockTransactionDetail,
				transaction: { message: { instructions: [] } },
				meta: { innerInstructions: [] }
			});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
		});

		it('should process instructions (and inner instructions) and return transactions', async () => {
			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(expectedResults);

			expect(spyMapSolParsedInstruction).toHaveBeenCalledTimes(nInstructions);
			mockAllInstructions.forEach((instruction, index) => {
				expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(index + 1, {
					instruction: { ...instruction, programAddress: instruction.programId },
					network,
					cumulativeBalances:
						index === 0
							? {}
							: {
									[mockSolAddress]: -mockValue * BigInt(index),
									[mockSolAddress2]: mockValue * BigInt(index)
								},
					addressToToken: {}
				});
			});
		});

		it('should process inner instructions if they are the only ones present', async () => {
			const innerInstructions = mockInnerInstructions.flatMap(({ instructions }) => instructions);

			const expectedInnerInstructions: SolTransactionUi[] = innerInstructions
				.map((instruction, index) => ({
					...expected,
					id: `${expected.id}-${index}-${instruction.programId}`
				}))
				.reverse();

			spyFetchTransactionDetailForSignature.mockResolvedValue(
				mockTransactionDetailOnlyInnerInstructions
			);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(
				expectedInnerInstructions
			);

			expect(spyMapSolParsedInstruction).toHaveBeenCalledTimes(innerInstructions.length);
			innerInstructions.forEach((instruction, index) => {
				expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(index + 1, {
					instruction: { ...instruction, programAddress: instruction.programId },
					network,
					cumulativeBalances:
						index === 0
							? {}
							: {
									[mockSolAddress]: -mockValue * BigInt(index),
									[mockSolAddress2]: mockValue * BigInt(index)
								},
					addressToToken: {}
				});
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

		it('should return transactions if they match the token address', async () => {
			spyMapSolParsedInstruction.mockResolvedValueOnce({
				...mockMappedTransaction,
				tokenAddress: mockSplAddress
			});

			await expect(
				fetchSolTransactionsForSignature({
					...mockParams,
					tokenAddress: mockSplAddress,
					tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
				})
			).resolves.toEqual([expectedResults[expectedResults.length - 1]]);
			expect(spyFindAssociatedTokenPda).toHaveBeenCalledOnce();
		});

		it('should return an empty array if no mapped transactions match token address', async () => {
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
					id: `${expected.id}-0-${mockInstructions[0].programId}-self`,
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

		it('should map addresses to tokens', async () => {
			let callCount = 0;

			spyMapSolParsedInstruction = vi
				.spyOn(solInstructionsUtils, 'mapSolParsedInstruction')
				.mockImplementation((): Promise<SolMappedTransaction> => {
					callCount++;

					return Promise.resolve({
						...mockMappedTransaction,
						...(callCount === indexStartAtaMapping
							? {
									from: mockAtaAddress,
									to: mockAtaAddress2,
									tokenAddress: mockSplAddress
								}
							: {})
					});
				});

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(
				expectedResults
					.toReversed()
					.toSpliced(indexStartAtaMapping - 1, 1)
					.toReversed()
			);

			expect(spyMapSolParsedInstruction).toHaveBeenCalledTimes(nInstructions);
			mockAllInstructions.forEach((instruction, index) => {
				expect(spyMapSolParsedInstruction).toHaveBeenNthCalledWith(index + 1, {
					instruction: { ...instruction, programAddress: instruction.programId },
					network,
					cumulativeBalances:
						index === 0
							? {}
							: {
									[mockSolAddress]:
										-mockValue * BigInt(index >= indexStartAtaMapping ? index - 1 : index),
									[mockSolAddress2]:
										mockValue * BigInt(index >= indexStartAtaMapping ? index - 1 : index)
								},
					addressToToken:
						index >= indexStartAtaMapping
							? {
									[mockAtaAddress]: mockSplAddress,
									[mockAtaAddress2]: mockSplAddress
								}
							: {}
				});
			});
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
