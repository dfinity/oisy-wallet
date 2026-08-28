import { BONK_TOKEN, BONK_TOKEN_ID } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { solAddressDevnetStore, solAddressMainnetStore } from '$lib/stores/address.store';
import * as solanaApi from '$sol/api/solana.api';
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
import type { SolRpcTransaction, SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolSignature, mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import {
	createMockSolTransactionsUi,
	mockSolTransactionDetail
} from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import * as solProgramToken from '@solana-program/token';
import { lamports } from '@solana/kit';
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

		// A minimal executed transfer: the user pays the fee and sends lamports to the recipient.
		const detailWith = ({
			instructions = [
				{
					program: 'system',
					programId: '11111111111111111111111111111111',
					parsed: {
						type: 'transfer',
						info: { source: mockSolAddress, destination: mockSolAddress2, lamports: 1_000_000 }
					}
				}
			],
			accountKeys = [
				{ pubkey: mockSolAddress, signer: true, writable: true, source: 'transaction' },
				{ pubkey: mockSolAddress2, signer: false, writable: true, source: 'transaction' }
			],
			fee = 5000n,
			preBalances = [10_000_000n, ZERO],
			postBalances = [8_995_000n, 1_000_000n],
			innerInstructions = [],
			preTokenBalances = [],
			postTokenBalances = []
		}: {
			instructions?: unknown[];
			accountKeys?: unknown[];
			fee?: bigint;
			preBalances?: bigint[];
			postBalances?: bigint[];
			innerInstructions?: unknown[];
			preTokenBalances?: unknown[];
			postTokenBalances?: unknown[];
		} = {}): SolRpcTransaction =>
			({
				...mockSolTransactionDetail,
				transaction: {
					...mockSolTransactionDetail.transaction,
					message: {
						...mockSolTransactionDetail.transaction.message,
						instructions,
						accountKeys
					}
				},
				meta: {
					...mockSolTransactionDetail.meta,
					fee: lamports(fee),
					preBalances: preBalances.map((balance) => lamports(balance)),
					postBalances: postBalances.map((balance) => lamports(balance)),
					innerInstructions,
					preTokenBalances,
					postTokenBalances
				}
			}) as SolRpcTransaction;

		let spyFetchTransactionDetailForSignature: MockInstance;
		let spyGetAccountOwner: MockInstance;

		beforeEach(() => {
			spyFetchTransactionDetailForSignature = vi.spyOn(
				solanaApi,
				'fetchTransactionDetailForSignature'
			);
			spyFetchTransactionDetailForSignature.mockResolvedValue(detailWith());

			spyGetAccountOwner = vi.spyOn(solanaApi, 'getAccountOwner').mockResolvedValue(undefined);
		});

		it('should return an empty array if transaction detail is nullish', async () => {
			spyFetchTransactionDetailForSignature.mockResolvedValueOnce(null);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
		});

		it('should return a single record per signature', async () => {
			const result = await fetchSolTransactionsForSignature(mockParams);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(mockSignature.signature);
			expect(result[0].signature).toBe(mockSignature.signature);
		});

		it('should describe a send with its counterparty and net value', async () => {
			const [record] = await fetchSolTransactionsForSignature(mockParams);

			expect(record.type).toBe('send');
			expect(record.from).toBe(mockSolAddress);
			expect(record.to).toBe(mockSolAddress2);
			// The fee is the fee: the value is what was sent, not what left the wallet in total.
			expect(record.value).toBe(1_000_000n);
			expect(record.fee).toBe(5000n);
		});

		it('should describe a receive from the sender', async () => {
			spyFetchTransactionDetailForSignature.mockResolvedValueOnce(
				detailWith({
					instructions: [
						{
							program: 'system',
							programId: '11111111111111111111111111111111',
							parsed: {
								type: 'transfer',
								info: { source: mockSolAddress2, destination: mockSolAddress, lamports: 1_000_000 }
							}
						}
					],
					accountKeys: [
						{ pubkey: mockSolAddress2, signer: true, writable: true, source: 'transaction' },
						{ pubkey: mockSolAddress, signer: false, writable: true, source: 'transaction' }
					],
					preBalances: [10_000_000n, ZERO],
					postBalances: [8_995_000n, 1_000_000n]
				})
			);

			const [record] = await fetchSolTransactionsForSignature(mockParams);

			expect(record.type).toBe('receive');
			expect(record.from).toBe(mockSolAddress2);
			expect(record.to).toBe(mockSolAddress);
			expect(record.value).toBe(1_000_000n);
			// Somebody else paid the fee, so none is charged to this record.
			expect(record.fee).toBe(ZERO);
		});

		it('should carry the summary, the net changes and the instruction list for the modal', async () => {
			const [record] = await fetchSolTransactionsForSignature(mockParams);

			expect(record.summary?.kind).toBe('send');
			expect(record.summary?.counterparty).toBe(mockSolAddress2);
			expect(record.netChanges).toStrictEqual([{ delta: -1_000_000n }]);
			expect(record.instructions).toHaveLength(1);
			expect(record.instructions?.[0].kind).toBe('send');
		});

		it('should return nothing for a transaction the user has no part in', async () => {
			spyFetchTransactionDetailForSignature.mockResolvedValueOnce(
				detailWith({
					instructions: [
						{
							program: 'system',
							programId: '11111111111111111111111111111111',
							parsed: {
								type: 'transfer',
								info: { source: mockSolAddress2, destination: mockSolAddress3, lamports: 7 }
							}
						}
					],
					accountKeys: [
						{ pubkey: mockSolAddress2, signer: true, writable: true, source: 'transaction' },
						{ pubkey: mockSolAddress3, signer: false, writable: true, source: 'transaction' }
					],
					preBalances: [10_000n, ZERO],
					postBalances: [ZERO, 10_000n]
				})
			);

			await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
		});

		// An approval reduces to kind other: naming the wallet as its own recipient would fabricate
		// a transfer to self that never happened.
		it('should leave the recipient empty for a transaction that is neither send nor receive', async () => {
			spyFetchTransactionDetailForSignature.mockResolvedValueOnce(
				detailWith({
					instructions: [
						{
							program: 'spl-token',
							programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
							parsed: {
								type: 'approve',
								info: {
									source: mockSolAddress,
									delegate: mockSolAddress2,
									owner: mockSolAddress,
									amount: '5'
								}
							}
						}
					],
					preBalances: [10_000n, ZERO],
					postBalances: [10_000n, ZERO]
				})
			);

			const [record] = await fetchSolTransactionsForSignature(mockParams);

			expect(record.summary?.kind).toBe('other');
			expect(record.to).toBeUndefined();
			expect(record.from).toBe(mockSolAddress);
		});

		it('should resolve the owner of the counterparty for the record', async () => {
			spyGetAccountOwner.mockResolvedValueOnce(mockSolAddress3);

			const [record] = await fetchSolTransactionsForSignature(mockParams);

			expect(record.toOwner).toBe(mockSolAddress3);
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
			token: mockToken,
			signalEnd
		};

		// The loader reads the store at call time rather than taking a list, so the cases below set up
		// what it should find there.
		const seedStore = (transactions: SolTransactionUi[]) => {
			solTransactionsStore.reset(mockToken.id);
			solTransactionsStore.append({
				tokenId: mockToken.id,
				transactions: transactions.map((data) => ({ data, certified: false }))
			});
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			solAddressMainnetStore.set({ data: mockSolAddress, certified: false });

			vi.mocked(loadSolUserTransactions).mockResolvedValue(undefined);
			spyGetTransactions.mockResolvedValue([]);

			seedStore(mockTransactions);
		});

		it('should not load transactions if the transactions list is empty', async () => {
			solTransactionsStore.reset(mockToken.id);

			const result = await loadNextSolTransactionsByOldest(mockParams);

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

			seedStore(transactions);

			const result = await loadNextSolTransactionsByOldest(mockParams);

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

			seedStore(transactions);

			const result = await loadNextSolTransactionsByOldest(mockParams);

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
