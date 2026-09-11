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
import { saveSolFinalizedTransactions } from '$sol/services/sol-user-transactions.services';
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

		describe('with the token accounts of the user passed in', () => {
			// Somebody else pays into a token account of the user that holds no balance on either side:
			// only the accounts the caller names can tell that the account is theirs.
			const detail = () =>
				detailWith({
					instructions: [
						{
							program: 'spl-token',
							programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
							parsed: {
								type: 'transfer',
								info: {
									source: mockSolAddress3,
									destination: mockAtaAddress,
									authority: mockSolAddress2,
									amount: '5'
								}
							}
						}
					],
					accountKeys: [
						{ pubkey: mockSolAddress2, signer: true, writable: true, source: 'transaction' },
						{ pubkey: mockSolAddress3, signer: false, writable: true, source: 'transaction' },
						{ pubkey: mockAtaAddress, signer: false, writable: true, source: 'transaction' }
					],
					preBalances: [10_000n, ZERO, ZERO],
					postBalances: [5_000n, ZERO, ZERO]
				});

			it('should return nothing when the account is not named', async () => {
				spyFetchTransactionDetailForSignature.mockResolvedValueOnce(detail());

				await expect(fetchSolTransactionsForSignature(mockParams)).resolves.toEqual([]);
			});

			it('should treat every account named as the user own', async () => {
				spyFetchTransactionDetailForSignature.mockResolvedValueOnce(detail());

				const result = await fetchSolTransactionsForSignature({
					...mockParams,
					ownedTokenAccounts: [mockSplAddress, mockAtaAddress]
				});

				expect(result).toHaveLength(1);
				expect(result[0].instructions).toHaveLength(1);
				expect(spyFindAssociatedTokenPda).not.toHaveBeenCalled();
			});
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

			const result = await loadNextSolTransactions({ ...mockParams, before });

			expect(get(solTransactionsStore)?.[mockToken.id]).toStrictEqual(initialTransactions);

			// A failed page is not the end of the history: signalling the end would retire the token
			// from the Activity list until the page is re-entered.
			expect(signalEnd).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, err: error });
		});

		it('should signal end only when a page that loaded holds no transaction', async () => {
			spyGetTransactions.mockResolvedValueOnce([]);

			const result = await loadNextSolTransactions({
				...mockParams,
				before: mockSolSignature()
			});

			expect(signalEnd).toHaveBeenCalledOnce();
			expect(result).toEqual({ success: true });
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

		it('should save the page under the SPL token it was loaded for', async () => {
			await loadNextSolTransactions({ ...mockParams, token: BONK_TOKEN });

			expect(saveSolFinalizedTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: { SplMainnet: BONK_TOKEN.address },
				transactions: mockTransactions
			});
		});

		it('should set only the transactions the chain returned', async () => {
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

		it('should not signal the end when the page fails to load', async () => {
			const err = new Error('Failed to load transactions');

			spyGetTransactions.mockRejectedValueOnce(err);

			const result = await loadNextSolTransactionsByOldest(mockParams);

			// The Activity list stops paginating a token for good once the end is signalled, so a
			// failed page has to leave it open for the next attempt, and say it failed so the list
			// does not read it as an ordinary stop.
			expect(signalEnd).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, err });

			expect(get(solTransactionsStore)?.[mockToken.id]).toHaveLength(mockTransactions.length);
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

		it('should page from the oldest transaction even when the store is not in order', async () => {
			// What the wallet worker delivers on a cold start: the transactions it read over RPC,
			// followed by the shorter page the backend had stored. The newest entries end up last,
			// so the position in the array is not the order.
			const [newest, ...older] = mockTransactions;

			seedStore([...older, newest]);

			const { signature: oldestSignature } = older[older.length - 1];

			const result = await loadNextSolTransactionsByOldest(mockParams);

			expect(result).toEqual({ success: true });

			expect(spyGetTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: oldestSignature
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
