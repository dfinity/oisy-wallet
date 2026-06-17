import { BONK_TOKEN, BONK_TOKEN_ID } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { solAddressDevnetStore, solAddressMainnetStore } from '$lib/stores/address.store';
import * as solanaApi from '$sol/api/solana.api';
import { getAccountOwner } from '$sol/api/solana.api';
import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import * as solSignaturesServices from '$sol/services/sol-signatures.services';
import {
	fetchSolTransactionsForSignature,
	loadNextSolTransactions,
	loadNextSolTransactionsByOldest
} from '$sol/services/sol-transactions.services';
import {
	loadSolUserTransactions,
	saveSolFinalizedTransactions
} from '$sol/services/sol-user-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import type { LoadNextSolTransactionsParams } from '$sol/types/sol-api';
import type {
	SolMappedTransaction,
	SolRpcTransaction,
	SolSignature,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import * as solInstructionsUtils from '$sol/utils/sol-instructions.utils';
import {
	mapSolTransactionToUserTransaction,
	mapUserTransactionToSolTransaction
} from '$sol/utils/user-transactions.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
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
import { address as solAddress, stringifiedBigInt, stringifiedNumber } from '@solana/kit';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

vi.mock('$env/user-transactions.env', () => ({
	USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED: true
}));

vi.mock('$sol/services/sol-user-transactions.services', () => ({
	loadSolUserTransactions: vi.fn().mockResolvedValue(undefined),
	saveSolFinalizedTransactions: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock(import('$sol/api/solana.api'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getAccountOwner: vi.fn()
	};
});

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

		mockAuthStore();
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
			identity: mockIdentity,
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

		const initialBalance =
			(mockTransactionDetail.meta?.preBalances[0] ?? ZERO) -
			(mockTransactionDetail.meta?.postBalances[0] ?? ZERO);

		const expected: SolTransactionUi = {
			id: mockSignature.signature,
			signature: mockSignature.signature,
			blockNumber: Number(mockTransactionDetail.slot),
			timestamp: mockTransactionDetail.blockTime ?? ZERO,
			value: mockMappedTransaction.value,
			from: mockSolAddress,
			to: mockSolAddress2,
			type: 'send',
			status: mockTransactionDetail.confirmationStatus,
			fee: mockTransactionDetail.meta?.fee
		};

		const indexStartAtaMapping = Math.floor(mockAllInstructions.length / 3);
		const mockInitializedTokenAccount = 'F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3';
		const mockInitializedTokenAddress = 'So11111111111111111111111111111111111111112';
		const expectedInstructionAddressToToken = ({
			instructions,
			index
		}: {
			instructions: ReadonlyArray<(typeof mockAllInstructions)[number]>;
			index: number;
		}): Record<string, string> => {
			const indexStartInstructionTokenMapping = instructions.findIndex(
				(instruction) => 'parsed' in instruction && instruction.parsed.type === 'initializeAccount3'
			);

			return indexStartInstructionTokenMapping >= 0 && index >= indexStartInstructionTokenMapping
				? { [mockInitializedTokenAccount]: mockInitializedTokenAddress }
				: {};
		};

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
					identity: mockIdentity,
					instruction: { ...instruction, programAddress: instruction.programId },
					network,
					cumulativeBalances:
						index === 0
							? {
									[mockSolAddress]: initialBalance
								}
							: {
									[mockSolAddress]: initialBalance - mockValue * BigInt(index),
									[mockSolAddress2]: mockValue * BigInt(index)
								},
					addressToToken: expect.objectContaining(
						expectedInstructionAddressToToken({
							instructions: mockAllInstructions,
							index
						})
					)
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
					identity: mockIdentity,
					instruction: { ...instruction, programAddress: instruction.programId },
					network,
					cumulativeBalances:
						index === 0
							? {
									[mockSolAddress]: initialBalance
								}
							: {
									[mockSolAddress]: initialBalance - mockValue * BigInt(index),
									[mockSolAddress2]: mockValue * BigInt(index)
								},
					addressToToken: expect.objectContaining(
						expectedInstructionAddressToToken({
							instructions: innerInstructions,
							index
						})
					)
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
					identity: mockIdentity,
					instruction: { ...instruction, programAddress: instruction.programId },
					network,
					cumulativeBalances:
						index === 0
							? {
									[mockSolAddress]: initialBalance
								}
							: {
									[mockSolAddress]:
										initialBalance -
										mockValue * BigInt(index >= indexStartAtaMapping ? index - 1 : index),
									[mockSolAddress2]:
										mockValue * BigInt(index >= indexStartAtaMapping ? index - 1 : index)
								},
					addressToToken: expect.objectContaining({
						...expectedInstructionAddressToToken({
							instructions: mockAllInstructions,
							index
						}),
						...(index >= indexStartAtaMapping && {
							[mockAtaAddress]: mockSplAddress,
							[mockAtaAddress2]: mockSplAddress
						})
					})
				});
			});
		});

		it('should map the owner address if it exists', async () => {
			vi.mocked(getAccountOwner).mockResolvedValue('mock-owner-address');

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual(
				expectedResults.map((transaction) => ({
					...transaction,
					fromOwner: 'mock-owner-address',
					toOwner: 'mock-owner-address'
				}))
			);
		});

		it('should preserve token-balance owners for SPL transfers', async () => {
			const usdtAmount = 39974n;
			const tokenBalance = {
				accountIndex: 0,
				mint: solAddress(mockSplAddress),
				owner: solAddress(mockSolAddress),
				programId: solAddress(TOKEN_PROGRAM_ADDRESS),
				uiTokenAmount: {
					amount: stringifiedBigInt(usdtAmount.toString()),
					decimals: 6,
					uiAmount: 0.039974,
					uiAmountString: stringifiedNumber('0.039974')
				}
			} as NonNullable<NonNullable<SolRpcTransaction['meta']>['postTokenBalances']>[number];
			const tokenBalanceTo = {
				...tokenBalance,
				accountIndex: 1,
				owner: solAddress(mockSolAddress2)
			};
			const mockTransactionDetailWithTokenBalances = {
				...mockTransactionDetail,
				transaction: {
					...mockTransactionDetail.transaction,
					message: {
						...mockTransactionDetail.transaction.message,
						accountKeys: [
							{
								pubkey: solAddress(mockAtaAddress),
								signer: false,
								source: 'transaction',
								writable: true
							},
							{
								pubkey: solAddress(mockAtaAddress2),
								signer: false,
								source: 'transaction',
								writable: true
							},
							{
								pubkey: solAddress(mockSolAddress),
								signer: true,
								source: 'transaction',
								writable: true
							}
						],
						instructions: [
							{
								parsed: {
									info: {
										amount: usdtAmount.toString(),
										authority: mockSolAddress,
										destination: mockAtaAddress2,
										source: mockAtaAddress
									},
									type: 'transfer'
								},
								program: 'spl-token',
								programId: solAddress(TOKEN_PROGRAM_ADDRESS),
								stackHeight: undefined
							}
						]
					}
				},
				meta: {
					...mockTransactionDetail.meta,
					innerInstructions: [],
					preTokenBalances: [tokenBalance, tokenBalanceTo],
					postTokenBalances: [tokenBalance, tokenBalanceTo]
				}
			} as SolRpcTransaction;

			spyFetchTransactionDetailForSignature.mockResolvedValue(
				mockTransactionDetailWithTokenBalances
			);
			vi.mocked(getAccountOwner).mockResolvedValue(undefined);
			spyMapSolParsedInstruction.mockResolvedValue({
				value: usdtAmount,
				from: mockAtaAddress,
				to: mockAtaAddress2,
				tokenAddress: mockSplAddress
			});

			await expect(
				fetchSolTransactionsForSignature({
					...mockParams,
					tokenAddress: mockSplAddress,
					tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
				})
			).resolves.toEqual([
				expect.objectContaining({
					type: 'send',
					value: usdtAmount,
					from: mockAtaAddress,
					fromOwner: mockSolAddress,
					to: mockAtaAddress2,
					toOwner: mockSolAddress2
				})
			]);
			expect(getAccountOwner).not.toHaveBeenCalled();
		});

		it('should preserve instruction-derived ATA owners for cached SPL transfers', async () => {
			const usdtAmount = 39974n;
			const mockTransactionDetailWithClosedAta = {
				...mockTransactionDetail,
				transaction: {
					...mockTransactionDetail.transaction,
					message: {
						...mockTransactionDetail.transaction.message,
						instructions: [
							{
								parsed: {
									info: {
										account: mockAtaAddress,
										mint: mockSplAddress,
										source: mockSolAddress,
										tokenProgram: TOKEN_PROGRAM_ADDRESS,
										wallet: mockSolAddress
									},
									type: 'createIdempotent'
								},
								program: 'spl-associated-token-account',
								programId: solAddress(ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS),
								stackHeight: undefined
							},
							{
								parsed: {
									info: {
										amount: usdtAmount.toString(),
										authority: mockSolAddress2,
										destination: mockAtaAddress,
										source: mockSolAddress2
									},
									type: 'transfer'
								},
								program: 'spl-token',
								programId: solAddress(TOKEN_PROGRAM_ADDRESS),
								stackHeight: undefined
							},
							{
								parsed: {
									info: {
										amount: usdtAmount.toString(),
										authority: mockSolAddress,
										destination: mockSolAddress2,
										source: mockAtaAddress
									},
									type: 'transfer'
								},
								program: 'spl-token',
								programId: solAddress(TOKEN_PROGRAM_ADDRESS),
								stackHeight: undefined
							}
						]
					}
				},
				meta: {
					...mockTransactionDetail.meta,
					innerInstructions: []
				}
			};

			spyFetchTransactionDetailForSignature.mockResolvedValue(mockTransactionDetailWithClosedAta);
			spyFindAssociatedTokenPda.mockResolvedValue([mockAtaAddress]);
			vi.mocked(getAccountOwner).mockResolvedValue(undefined);
			spyMapSolParsedInstruction.mockImplementation(
				({
					instruction
				}: Parameters<typeof solInstructionsUtils.mapSolParsedInstruction>[0]): Promise<
					SolMappedTransaction | undefined
				> => {
					if (!('parsed' in instruction)) {
						return Promise.resolve(undefined);
					}

					const {
						parsed: { type, info }
					} = instruction;

					if (type !== 'transfer') {
						return Promise.resolve(undefined);
					}

					const {
						amount,
						source: from,
						destination: to
					} = info as {
						amount: string;
						source: SolMappedTransaction['from'];
						destination: SolMappedTransaction['to'];
					};

					return Promise.resolve({
						value: BigInt(amount),
						from,
						to,
						tokenAddress: mockSplAddress
					});
				}
			);

			const transactions = await fetchSolTransactionsForSignature({
				...mockParams,
				tokenAddress: mockSplAddress,
				tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
			});

			expect(transactions).toEqual([
				expect.objectContaining({
					type: 'send',
					value: usdtAmount,
					from: mockAtaAddress,
					fromOwner: mockSolAddress,
					to: mockSolAddress2
				}),
				expect.objectContaining({
					type: 'receive',
					value: usdtAmount,
					from: mockSolAddress2,
					to: mockAtaAddress,
					toOwner: mockSolAddress
				})
			]);
			expect(
				vi.mocked(getAccountOwner).mock.calls.some(([{ address }]) => address === mockAtaAddress)
			).toBeFalsy();

			const [outboundTransaction] = transactions;
			const cachedOutboundTransaction = mapUserTransactionToSolTransaction({
				transaction: mapSolTransactionToUserTransaction(outboundTransaction),
				address: mockSolAddress
			});

			expect(cachedOutboundTransaction.type).toBe('send');
			expect(cachedOutboundTransaction.fromOwner).toBe(mockSolAddress);
		});
	});

	describe('loadNextSolTransactions', () => {
		const mockToken = SOLANA_TOKEN;

		const mockParams: LoadNextSolTransactionsParams = {
			identity: mockIdentity,
			token: mockToken,
			signalEnd
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
			solAddressDevnetStore.set({ data: mockSolAddress2, certified: false });

			solTransactionsStore.reset(mockToken.id);
			solTransactionsStore.reset(BONK_TOKEN_ID);

			spyGetTransactions.mockResolvedValue(mockTransactions);
		});

		it('should not load transactions if Solana address is nullish', async () => {
			solAddressMainnetStore.reset();

			await loadNextSolTransactions(mockParams);

			expect(spyGetTransactions).not.toHaveBeenCalled();
		});

		it('should not load transactions for a non-Solana token', async () => {
			await loadNextSolTransactions({ ...mockParams, token: ETHEREUM_TOKEN });

			expect(spyGetTransactions).not.toHaveBeenCalled();
		});

		it('should load transactions successfully for native Solana tokens', async () => {
			await loadNextSolTransactions(mockParams);

			expect(signalEnd).not.toHaveBeenCalled();

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});
		});

		it('should load transactions successfully for SPL tokens', async () => {
			await loadNextSolTransactions({ ...mockParams, token: BONK_TOKEN });

			expect(signalEnd).not.toHaveBeenCalled();

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokenAddress: BONK_TOKEN.address,
				tokenOwnerAddress: BONK_TOKEN.owner
			});
		});

		it('should handle pagination parameters', async () => {
			const before = mockSolSignature();
			const limit = 10;

			await loadNextSolTransactions({
				...mockParams,
				before,
				limit
			});

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before,
				limit
			});
		});

		it('should signal end when no transactions are returned', async () => {
			spyGetTransactions.mockResolvedValueOnce([]);

			await loadNextSolTransactions(mockParams);

			expect(signalEnd).toHaveBeenCalledOnce();
		});

		it('should append transactions to the store', async () => {
			await loadNextSolTransactions(mockParams);

			expect(get(solTransactionsStore)?.[mockToken.id]).toEqual(mockCertifiedTransactions);

			await loadNextSolTransactions({ ...mockParams, token: BONK_TOKEN });

			expect(get(solTransactionsStore)?.[BONK_TOKEN_ID]).toEqual(mockCertifiedTransactions);
		});

		it('should handle errors and reset store', async () => {
			const initialTransactions = createMockSolTransactionsUi(11).map((transaction) => ({
				data: transaction,
				certified: false
			}));
			const error = new Error('Failed to load transactions');

			solTransactionsStore.append({ tokenId: mockToken.id, transactions: initialTransactions });
			spyGetTransactions.mockRejectedValue(error);

			await loadNextSolTransactions(mockParams);

			expect(get(solTransactionsStore)?.[mockToken.id]).toBeNull();
		});

		it('should keep loaded transactions if loading the next page raises an error', async () => {
			const initialTransactions = createMockSolTransactionsUi(11).map((transaction) => ({
				data: transaction,
				certified: false
			}));
			const before = mockSolSignature();
			const error = new Error('Failed to load transactions');

			solTransactionsStore.append({ tokenId: mockToken.id, transactions: initialTransactions });
			spyGetTransactions.mockRejectedValue(error);

			await loadNextSolTransactions({ ...mockParams, before });

			expect(get(solTransactionsStore)?.[mockToken.id]).toStrictEqual(initialTransactions);
			expect(signalEnd).toHaveBeenCalledOnce();
		});

		it('should work with different networks', async () => {
			await loadNextSolTransactions({
				...mockParams,
				token: SOLANA_DEVNET_TOKEN
			});

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress2,
				network: SolanaNetworks.devnet
			});
		});

		it('should call loadSolUserTransactions with correct params', async () => {
			spyGetTransactions.mockResolvedValue([]);

			await loadNextSolTransactions(mockParams);

			expect(loadSolUserTransactions).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokenId: { SolNativeMainnet: null },
				address: mockSolAddress
			});
		});

		it('should pass exitIfFirstSignatureMatches when loading head with backend-stored transactions', async () => {
			const storedTransactions = createMockSolTransactionsUi(2).map((tx, i) => ({
				...tx,
				id: `stored-${i}`
			}));
			const [firstStored] = storedTransactions;

			vi.mocked(loadSolUserTransactions).mockResolvedValue({
				transactions: storedTransactions,
				newestBlockIndex: 100n,
				oldestBlockIndex: 50n,
				nextStart: undefined,
				totalStored: 2n
			});
			spyGetTransactions.mockResolvedValueOnce([]);

			await loadNextSolTransactions(mockParams);

			expect(spyGetTransactions).toHaveBeenCalledWith(
				expect.objectContaining({
					exitIfFirstSignatureMatches: String(firstStored.signature)
				})
			);
		});

		it('should not pass exitIfFirstSignatureMatches when paginating with before', async () => {
			const storedTransactions = createMockSolTransactionsUi(2);

			vi.mocked(loadSolUserTransactions).mockResolvedValue({
				transactions: storedTransactions,
				newestBlockIndex: 100n,
				oldestBlockIndex: 50n,
				nextStart: undefined,
				totalStored: 2n
			});

			const before = mockSolSignature();
			spyGetTransactions.mockResolvedValueOnce([]);

			await loadNextSolTransactions({ ...mockParams, before, limit: 10 });

			const [[callArg]] = spyGetTransactions.mock.calls;

			expect(callArg.exitIfFirstSignatureMatches).toBeUndefined();
			expect(callArg.before).toBe(before);
			expect(loadSolUserTransactions).not.toHaveBeenCalled();
		});

		it('should combine stored and new transactions in the store', async () => {
			const storedTransactions = createMockSolTransactionsUi(2).map((tx, i) => ({
				...tx,
				id: `stored-${i}`
			}));

			vi.mocked(loadSolUserTransactions).mockResolvedValue({
				transactions: storedTransactions,
				newestBlockIndex: 100n,
				oldestBlockIndex: 50n,
				nextStart: undefined,
				totalStored: 2n
			});

			const newTransactions = createMockSolTransactionsUi(3).map((tx, i) => ({
				...tx,
				id: `new-${i}`
			}));
			spyGetTransactions.mockResolvedValue(newTransactions);

			await loadNextSolTransactions(mockParams);

			expect(get(solTransactionsStore)?.[mockToken.id]).toEqual(
				[...newTransactions, ...storedTransactions].map((data) => ({
					data,
					certified: false
				}))
			);
		});

		it('should filter non-newer RPC transactions when loading head with backend-stored transactions', async () => {
			const storedTransactions = createMockSolTransactionsUi(2).map((tx, i) => ({
				...tx,
				id: `stored-${i}`
			}));

			vi.mocked(loadSolUserTransactions).mockResolvedValue({
				transactions: storedTransactions,
				newestBlockIndex: 100n,
				oldestBlockIndex: 50n,
				nextStart: undefined,
				totalStored: 2n
			});

			const olderRpcTransaction = {
				...createMockSolTransactionsUi(1)[0],
				id: 'older-rpc',
				blockNumber: 99
			};
			const newerRpcTransaction = {
				...createMockSolTransactionsUi(1)[0],
				id: 'newer-rpc',
				blockNumber: 101
			};

			spyGetTransactions.mockResolvedValue([olderRpcTransaction, newerRpcTransaction]);

			await loadNextSolTransactions(mockParams);

			expect(get(solTransactionsStore)?.[mockToken.id]).toEqual(
				[newerRpcTransaction, ...storedTransactions].map((data) => ({
					data,
					certified: false
				}))
			);
			expect(saveSolFinalizedTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: { SolNativeMainnet: null },
				transactions: [newerRpcTransaction]
			});
		});

		it('should refresh stored SPL transactions that are missing owner context', async () => {
			const [storedTransaction, storedSameSignatureTransaction] = createMockSolTransactionsUi(
				2
			).map((tx, index) => ({
				...tx,
				id: `stored-same-signature-transaction-${index}`,
				blockNumber: 100
			}));
			const ownerlessStoredTransaction: SolTransactionUi = {
				...storedTransaction,
				id: 'ownerless-stored-transaction',
				blockNumber: 100,
				type: 'receive' as const,
				from: mockAtaAddress,
				to: mockSolAddress2,
				fromOwner: undefined,
				toOwner: undefined
			};
			const correctedTransaction: SolTransactionUi = {
				...ownerlessStoredTransaction,
				type: 'send',
				fromOwner: mockSolAddress
			};
			const correctedSameSignatureTransaction: SolTransactionUi = {
				...storedSameSignatureTransaction,
				id: 'corrected-same-signature-transaction'
			};

			vi.mocked(loadSolUserTransactions).mockResolvedValue({
				transactions: [ownerlessStoredTransaction, storedSameSignatureTransaction],
				newestBlockIndex: 100n,
				oldestBlockIndex: 100n,
				nextStart: undefined,
				totalStored: 2n
			});
			spyGetTransactions.mockResolvedValue([
				correctedTransaction,
				correctedSameSignatureTransaction
			]);

			await loadNextSolTransactions({ ...mockParams, token: BONK_TOKEN });

			expect(spyGetTransactions).toHaveBeenCalledWith(
				expect.objectContaining({
					exitIfFirstSignatureMatches: undefined
				})
			);
			expect(get(solTransactionsStore)?.[BONK_TOKEN_ID]).toEqual([
				{
					data: correctedTransaction,
					certified: false
				},
				{
					data: correctedSameSignatureTransaction,
					certified: false
				}
			]);
			expect(saveSolFinalizedTransactions).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokenId: { SplMainnet: BONK_TOKEN.address },
				transactions: [correctedTransaction, correctedSameSignatureTransaction]
			});
		});

		it('should keep older RPC transactions when paginating with before and backend-stored transactions', async () => {
			const storedTransactions = createMockSolTransactionsUi(2).map((tx, i) => ({
				...tx,
				id: `stored-${i}`
			}));

			vi.mocked(loadSolUserTransactions).mockResolvedValue({
				transactions: storedTransactions,
				newestBlockIndex: 100n,
				oldestBlockIndex: 50n,
				nextStart: undefined,
				totalStored: 2n
			});

			const olderRpcTransaction = {
				...createMockSolTransactionsUi(1)[0],
				id: 'older-rpc',
				blockNumber: 40
			};
			const before = mockSolSignature();

			spyGetTransactions.mockResolvedValueOnce([]);

			await loadNextSolTransactions(mockParams);

			spyGetTransactions.mockResolvedValueOnce([olderRpcTransaction]);
			await loadNextSolTransactions({ ...mockParams, before });

			expect(loadSolUserTransactions).toHaveBeenCalledOnce();
			expect(get(solTransactionsStore)?.[mockToken.id]).toEqual(
				[...storedTransactions, olderRpcTransaction].map((data) => ({
					data,
					certified: false
				}))
			);
			expect(saveSolFinalizedTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: { SolNativeMainnet: null },
				transactions: [olderRpcTransaction]
			});
		});

		it('should load backend pages before RPC when paginating with before', async () => {
			const storedTransactions = createMockSolTransactionsUi(2).map((tx, i) => ({
				...tx,
				id: `stored-${i}`
			}));
			const nextStoredTransactions = createMockSolTransactionsUi(2).map((tx, i) => ({
				...tx,
				id: `next-stored-${i}`
			}));
			const before = mockSolSignature();

			vi.mocked(loadSolUserTransactions)
				.mockResolvedValueOnce({
					transactions: storedTransactions,
					newestBlockIndex: 100n,
					oldestBlockIndex: 50n,
					nextStart: 2n,
					totalStored: 4n
				})
				.mockResolvedValueOnce({
					transactions: nextStoredTransactions,
					newestBlockIndex: 100n,
					oldestBlockIndex: 10n,
					nextStart: undefined,
					totalStored: 4n
				});

			spyGetTransactions.mockResolvedValueOnce([]);

			await loadNextSolTransactions(mockParams);
			await loadNextSolTransactions({ ...mockParams, before });

			expect(loadSolUserTransactions).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				tokenId: { SolNativeMainnet: null },
				address: mockSolAddress,
				start: 2n
			});
			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(get(solTransactionsStore)?.[mockToken.id]).toEqual(
				[...storedTransactions, ...nextStoredTransactions].map((data) => ({
					data,
					certified: false
				}))
			);
			expect(saveSolFinalizedTransactions).not.toHaveBeenCalled();
		});

		it('should set only new transactions when no stored transactions exist', async () => {
			vi.mocked(loadSolUserTransactions).mockResolvedValue(undefined);

			const newTransactions = createMockSolTransactionsUi(3);
			spyGetTransactions.mockResolvedValue(newTransactions);

			await loadNextSolTransactions(mockParams);

			expect(get(solTransactionsStore)?.[mockToken.id]).toEqual(
				newTransactions.map((data) => ({
					data,
					certified: false
				}))
			);
		});

		it('should call saveSolFinalizedTransactions when there are new transactions', async () => {
			vi.mocked(loadSolUserTransactions).mockResolvedValue(undefined);

			const newTransactions = createMockSolTransactionsUi(3);
			spyGetTransactions.mockResolvedValue(newTransactions);

			await loadNextSolTransactions(mockParams);

			expect(saveSolFinalizedTransactions).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokenId: { SolNativeMainnet: null },
				transactions: newTransactions
			});
		});

		it('should not call saveSolFinalizedTransactions when there are no new transactions', async () => {
			spyGetTransactions.mockResolvedValue([]);

			await loadNextSolTransactions(mockParams);

			expect(saveSolFinalizedTransactions).not.toHaveBeenCalled();
		});

		it('should still succeed when saveSolFinalizedTransactions rejects', async () => {
			vi.mocked(loadSolUserTransactions).mockResolvedValue(undefined);
			vi.mocked(saveSolFinalizedTransactions).mockRejectedValue(new Error('Backend save failed'));

			const newTransactions = createMockSolTransactionsUi(2);
			spyGetTransactions.mockResolvedValue(newTransactions);

			await loadNextSolTransactions(mockParams);

			expect(get(solTransactionsStore)?.[mockToken.id]).toEqual(
				newTransactions.map((data) => ({
					data,
					certified: false
				}))
			);
		});

		it('should handle loadSolUserTransactions failure gracefully', async () => {
			vi.mocked(loadSolUserTransactions).mockRejectedValue(new Error('Backend read failed'));

			const newTransactions = createMockSolTransactionsUi(2);
			spyGetTransactions.mockResolvedValue(newTransactions);

			await loadNextSolTransactions(mockParams);

			expect(get(solTransactionsStore)?.[mockToken.id]).toBeNull();
		});
	});

	describe('loadNextSolTransactionsByOldest', () => {
		const signalEnd = vi.fn();

		const mockToken = SOLANA_TOKEN;

		const mockMinTimestamp = 1_000_000_000;
		const timestampBuffer = BigInt(mockMinTimestamp) + 500_000_000n;

		const mockTransactions: SolTransactionUi[] = createMockSolTransactionsUi(17).map(
			(transaction, index) => ({
				...transaction,
				timestamp: timestampBuffer + BigInt(17 - index)
			})
		);
		const expectedOldestTransaction = mockTransactions[mockTransactions.length - 1];
		const { signature: mockLastSignature } = expectedOldestTransaction;

		const mockParams = {
			identity: mockIdentity,
			minTimestamp: mockMinTimestamp,
			transactions: mockTransactions,
			token: mockToken,
			signalEnd
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			solAddressMainnetStore.set({ data: mockSolAddress, certified: false });

			vi.mocked(loadSolUserTransactions).mockResolvedValue(undefined);
			spyGetTransactions.mockResolvedValue([]);
		});

		it('should not load transactions if the transactions list is empty', async () => {
			const result = await loadNextSolTransactionsByOldest({ ...mockParams, transactions: [] });

			expect(result).toEqual({ success: false });

			expect(spyGetTransactions).not.toHaveBeenCalled();
		});

		it('should not load transactions if the minimum timestamp is newer than all the transactions', async () => {
			const result = await loadNextSolTransactionsByOldest({
				...mockParams,
				minTimestamp: Number(timestampBuffer) * 10
			});

			expect(result).toEqual({ success: false });

			expect(spyGetTransactions).not.toHaveBeenCalled();
		});

		it('should load transactions with the correct parameters', async () => {
			const result = await loadNextSolTransactionsByOldest(mockParams);

			expect(result).toEqual({ success: true });

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: mockLastSignature
			});
		});

		it('should load transactions if the transactions have undefined timestamp', async () => {
			const transactions: SolTransactionUi[] = createMockSolTransactionsUi(17).map(
				(transaction) => ({
					...transaction,
					timestamp: undefined
				})
			);
			const lastSignature = transactions[transactions.length - 1].signature;

			const result = await loadNextSolTransactionsByOldest({ ...mockParams, transactions });

			expect(result).toEqual({ success: true });

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: lastSignature
			});
		});

		it('should use the last transaction cursor if oldest timestamps are tied', async () => {
			const transactions = mockTransactions.map((transaction) => ({
				...transaction,
				timestamp: timestampBuffer
			}));
			const lastSignature = transactions[transactions.length - 1].signature;

			const result = await loadNextSolTransactionsByOldest({ ...mockParams, transactions });

			expect(result).toEqual({ success: true });

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: lastSignature
			});
		});

		it('should handle minimum timestamp correctly in different units', async () => {
			const resultWithNano = await loadNextSolTransactionsByOldest({
				...mockParams,
				minTimestamp: mockMinTimestamp * 1_000_000_000 + 1
			});

			expect(resultWithNano).toEqual({ success: true });

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: mockLastSignature
			});

			vi.clearAllMocks();
			vi.mocked(loadSolUserTransactions).mockResolvedValue(undefined);
			spyGetTransactions.mockResolvedValue([]);

			const resultWithMillis = await loadNextSolTransactionsByOldest({
				...mockParams,
				minTimestamp: mockMinTimestamp * 1_000 + 1
			});

			expect(resultWithMillis).toEqual({ success: true });

			expect(spyGetTransactions).toHaveBeenCalledOnce();
			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: mockLastSignature
			});
		});
	});
});
