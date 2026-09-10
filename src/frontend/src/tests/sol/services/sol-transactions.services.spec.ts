import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import * as solanaApi from '$sol/api/solana.api';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolRpcTransaction, SolSignature } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { mockSolTransactionDetail } from '$tests/mocks/sol-transactions.mock';
import {
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import * as solProgramToken from '@solana-program/token';
import { lamports } from '@solana/kit';
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
	let spyFindAssociatedTokenPda: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
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
});
