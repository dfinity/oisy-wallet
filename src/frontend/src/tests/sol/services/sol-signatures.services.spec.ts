import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { last } from '$lib/utils/array.utils';
import * as solanaApi from '$sol/api/solana.api';
import {
	SOLANA_MAX_SKIPPED_SIGNATURE_PAGES,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { getSolSignatures, getSolTransactions } from '$sol/services/sol-signatures.services';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import type { RequiredSplToken, SplTokenAddress } from '$sol/types/spl';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockSolSignature,
	mockSolSignatureResponse,
	mockSolSignatureResponses,
	mockSolSignatureResponsesAtSlots
} from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { isNullish } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import { address, type Address, type Signature } from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-signatures.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.restoreAllMocks();

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
	});

	describe('getSolSignatures', () => {
		let spyFetchSignatures: MockInstance;
		let spyFindAssociatedTokenPda: MockInstance;

		const mockNetwork = SolanaNetworks.mainnet;
		const mockTokensList: RequiredSplToken[] = [BONK_TOKEN, USDC_TOKEN];
		const mockAtaAddresses: Record<SplTokenAddress, SolAddress> = {
			[BONK_TOKEN.address]: address(mockAtaAddress),
			[USDC_TOKEN.address]: address(mockAtaAddress2)
		};
		const mockParams = {
			address: mockSolAddress,
			network: mockNetwork,
			tokensList: mockTokensList
		};

		const mockError = new Error('Mock Error');

		const mockSignaturesSol: SolSignature[] = mockSolSignatureResponses(7);
		const mockSignaturesAta1: SolSignature[] = mockSolSignatureResponses(3);
		const mockSignaturesAta2: SolSignature[] = mockSolSignatureResponses(5);
		const mockSignatures: SolSignature[] = [
			...mockSignaturesSol,
			...mockSignaturesAta1,
			...mockSignaturesAta2
		];

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? mockSignaturesAta2
						: mockSignaturesSol
			);

			spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');
			spyFindAssociatedTokenPda.mockImplementation(({ mint }: { mint: Address }) => [
				mockAtaAddresses[mint.toString()]
			]);
		});

		it('should fetch all signatures successfully', async () => {
			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual(mockSignatures);

			expect(spyFetchSignatures).toHaveBeenCalledTimes(1 + mockTokensList.length);
			expect(spyFetchSignatures).toHaveBeenNthCalledWith(1, {
				network: mockNetwork,
				wallet: mockSolAddress,
				limit: Number(WALLET_PAGINATION)
			});

			mockTokensList.forEach(({ address }, index) => {
				expect(spyFetchSignatures).toHaveBeenNthCalledWith(index + 2, {
					network: mockNetwork,
					wallet: mockAtaAddresses[address],
					limit: Number(WALLET_PAGINATION)
				});
			});
		});

		it('should remove duplicates signatures', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? mockSignaturesSol
						: mockSignaturesSol
			);

			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual([...mockSignaturesSol, ...mockSignaturesAta1]);
		});

		it('should handle no token list', async () => {
			const { tokensList: _, ...params } = mockParams;

			const signatures = await getSolSignatures(params);

			expect(signatures).toEqual(mockSignaturesSol);

			expect(spyFetchSignatures).toHaveBeenCalledOnce();
			expect(spyFetchSignatures).toHaveBeenNthCalledWith(1, {
				network: mockNetwork,
				wallet: mockSolAddress,
				limit: Number(WALLET_PAGINATION)
			});
		});

		it('should handle an empty token list', async () => {
			const signatures = await getSolSignatures({
				...mockParams,
				tokensList: []
			});

			expect(signatures).toEqual(mockSignaturesSol);

			expect(spyFetchSignatures).toHaveBeenCalledOnce();
			expect(spyFetchSignatures).toHaveBeenNthCalledWith(1, {
				network: mockNetwork,
				wallet: mockSolAddress,
				limit: Number(WALLET_PAGINATION)
			});
		});

		it('should handle empty signatures for a token', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? []
						: mockSignaturesSol
			);

			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual([...mockSignaturesSol, ...mockSignaturesAta1]);
		});

		it('should handle empty signatures for the native token', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? mockSignaturesAta2
						: []
			);

			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual([...mockSignaturesAta1, ...mockSignaturesAta2]);
		});

		it('should handle before parameter', async () => {
			const signature = mockSolSignature();

			await getSolSignatures({ ...mockParams, before: signature });

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					before: signature
				})
			);
		});

		it('should handle limit parameter', async () => {
			await getSolSignatures({ ...mockParams, limit: 5 });

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 5
				})
			);
		});

		it('should handle empty signatures response', async () => {
			spyFetchSignatures.mockReturnValue([]);

			const transactions = await getSolSignatures(mockParams);

			expect(transactions).toEqual([]);
		});

		it('should handle RPC errors gracefully', async () => {
			spyFetchSignatures.mockRejectedValue(mockError);

			await expect(getSolSignatures(mockParams)).rejects.toThrow(mockError);
		});

		// One flaky token account costs the whole page, wallet signatures included: pinned so the
		// refactor changes it on purpose rather than by accident.
		it('should reject when a single token account lookup fails', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress ? Promise.reject(mockError) : mockSignaturesSol
			);

			await expect(getSolSignatures(mockParams)).rejects.toThrow(mockError);
		});

		// Looking them up one after the other would make a page take longer with every token held.
		it('should look up the token accounts concurrently', async () => {
			const resolvers: (() => void)[] = [];

			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockSolAddress
					? []
					: new Promise<SolSignature[]>((resolve) => resolvers.push(() => resolve([])))
			);

			const result = getSolSignatures(mockParams);

			await vi.waitFor(() =>
				expect(spyFetchSignatures).toHaveBeenCalledTimes(1 + mockTokensList.length)
			);

			resolvers.forEach((resolve) => resolve());

			await expect(result).resolves.toEqual([]);
		});

		describe('paging across the wallet and its token accounts', () => {
			const limit = 3;

			// Answers like the RPC: the newest signatures of the account strictly older than `before`.
			const mockHistories = ({
				wallet,
				tokenAccount
			}: {
				wallet: SolSignature[];
				tokenAccount: SolSignature[];
			}) => {
				const histories: Record<string, SolSignature[]> = {
					[mockSolAddress]: wallet,
					[mockAtaAddress]: tokenAccount,
					[mockAtaAddress2]: []
				};

				const allSignatures = [...wallet, ...tokenAccount];

				spyFetchSignatures.mockImplementation(
					({
						wallet: account,
						before,
						limit: pageLimit
					}: {
						wallet: Address;
						before?: Signature;
						limit: number;
					}) => {
						const beforeSlot = allSignatures.find(({ signature }) => signature === before)?.slot;

						return histories[account.toString()]
							.filter(({ slot }) => isNullish(beforeSlot) || slot < beforeSlot)
							.slice(0, pageLimit);
					}
				);
			};

			// Sorted so that the page boundary cases stay red only for the hole they pin, not for the order.
			const slotsNewestFirst = (signatures: SolSignature[]): bigint[] =>
				signatures.map(({ slot }) => slot).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

			it('should return every signature when each source holds fewer than the limit', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 90n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([80n])
				});

				const signatures = await getSolSignatures({ ...mockParams, limit });

				expect(signatures.map(({ slot }) => slot)).toEqual([100n, 90n, 80n]);
			});

			// Defect: the wallet page and each token account page are concatenated, not merged newest first.
			it.fails('should return the signatures newest first', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 90n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([95n, 85n])
				});

				const signatures = await getSolSignatures({ ...mockParams, limit });

				expect(signatures.map(({ slot }) => slot)).toEqual([100n, 95n, 90n, 85n]);
			});

			// Defect: the page runs past the oldest wallet signature fetched, over wallet signatures never fetched.
			it.fails(
				'should end the page at the newest of the oldest signatures of the full sources',
				async () => {
					mockHistories({
						wallet: mockSolSignatureResponsesAtSlots([100n, 95n, 91n, 88n]),
						tokenAccount: mockSolSignatureResponsesAtSlots([99n, 70n, 50n, 40n])
					});

					const signatures = await getSolSignatures({ ...mockParams, limit });

					expect(slotsNewestFirst(signatures)).toEqual([100n, 99n, 95n, 91n]);
				}
			);

			// Defect: a source that ran out of signatures still stretches the page past the full ones.
			it.fails('should not end the page at a source that holds fewer than the limit', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 95n, 91n, 88n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([99n, 80n])
				});

				const signatures = await getSolSignatures({ ...mockParams, limit });

				expect(slotsNewestFirst(signatures)).toEqual([100n, 99n, 95n, 91n]);
			});

			// Defect: paging on from the oldest signature of each page skips wallet signatures for good.
			it.fails(
				'should reach every signature when paging on from the oldest signature of each page',
				async () => {
					mockHistories({
						wallet: mockSolSignatureResponsesAtSlots([100n, 95n, 91n, 88n, 86n, 60n]),
						tokenAccount: mockSolSignatureResponsesAtSlots([99n, 70n, 50n, 40n])
					});

					const collected: SolSignature[] = [];
					let before: string | undefined;

					for (let page = 0; page < 10; page++) {
						const signatures = await getSolSignatures({ ...mockParams, before, limit });

						if (signatures.length === 0) {
							break;
						}

						collected.push(...signatures);

						before = signatures.reduce((oldest, current) =>
							current.slot < oldest.slot ? current : oldest
						).signature;
					}

					expect(slotsNewestFirst(collected)).toEqual([
						100n,
						99n,
						95n,
						91n,
						88n,
						86n,
						70n,
						60n,
						50n,
						40n
					]);
				}
			);
		});
	});

	describe('getSolTransactions', () => {
		let spyFetchSignatures: MockInstance;
		let spyFetchTransactionsForSignature: MockInstance;
		let spyFindAssociatedTokenPda: MockInstance;

		const mockError = new Error('Mock Error');

		const mockSignatures: SolSignature[] = mockSolSignatureResponses(7);

		const mockSolTransactions: SolTransactionUi[] = createMockSolTransactionsUi(3);

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			spyFetchSignatures.mockReturnValue(mockSignatures);

			spyFetchTransactionsForSignature = vi.spyOn(
				solTransactionsServices,
				'fetchSolTransactionsForSignature'
			);
			spyFetchTransactionsForSignature.mockResolvedValue(mockSolTransactions);

			spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');

			mockAuthStore();
		});

		it('should fetch transactions successfully', async () => {
			const transactions = await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(mockSignatures.length * mockSolTransactions.length);
			expect(spyFetchSignatures).toHaveBeenCalledOnce();
			expect(spyFetchTransactionsForSignature).toHaveBeenCalledTimes(mockSignatures.length);
		});

		it('should correctly handle a token address', async () => {
			spyFindAssociatedTokenPda.mockResolvedValueOnce([mockSplAddress]);

			await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokenAddress: mockSplAddress,
				tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
			});

			expect(spyFindAssociatedTokenPda).toHaveBeenCalledExactlyOnceWith({
				owner: mockSolAddress,
				tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
				mint: mockSplAddress
			});
		});

		// The token account only picks which signatures to load: the mapper derives it again from the
		// owner and matches balance changes against the owner, so it must be handed the owner.
		it('should load the signatures of the token account but map them for the owner', async () => {
			spyFindAssociatedTokenPda.mockResolvedValueOnce([address(mockAtaAddress)]);

			await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokenAddress: mockSplAddress,
				tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
			});

			expect(spyFetchSignatures).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ wallet: address(mockAtaAddress) })
			);

			expect(spyFetchTransactionsForSignature).toHaveBeenCalledTimes(mockSignatures.length);

			mockSignatures.forEach((signature, index) => {
				expect(spyFetchTransactionsForSignature).toHaveBeenNthCalledWith(index + 1, {
					signature,
					network: SolanaNetworks.mainnet,
					address: mockSolAddress,
					tokenAddress: mockSplAddress,
					tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
				});
			});
		});

		it('should return the transactions in the order of their signatures', async () => {
			const transactionsBySignature = createMockSolTransactionsUi(mockSignatures.length);

			// The newest signature settles last, so the order cannot come from which lookup ends first.
			spyFetchTransactionsForSignature.mockImplementation(
				async ({ signature }: { signature: SolSignature }) => {
					const index = mockSignatures.indexOf(signature);

					for (let tick = index; tick < mockSignatures.length; tick++) {
						await Promise.resolve();
					}

					return [transactionsBySignature[index]];
				}
			);

			const transactions = await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toEqual(transactionsBySignature);
		});

		it('should handle before parameter', async () => {
			const signature = mockSolSignature();
			await getSolTransactions({
				identity: mockIdentity,
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
				identity: mockIdentity,
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

		it('should handle empty signatures response', async () => {
			spyFetchSignatures.mockReturnValue([]);

			const transactions = await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
			expect(spyFetchTransactionsForSignature).not.toHaveBeenCalled();
		});

		it('should handle empty transactions responses', async () => {
			spyFetchSignatures.mockReturnValue([mockSolSignatureResponse()]);
			spyFetchTransactionsForSignature.mockReturnValue([]);

			const transactions = await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
		});

		it('should step over a page of signatures that map to nothing visible', async () => {
			const invisiblePage: SolSignature[] = mockSolSignatureResponses(3);

			spyFetchSignatures.mockReturnValueOnce(invisiblePage).mockReturnValueOnce(mockSignatures);
			spyFetchTransactionsForSignature.mockResolvedValueOnce([]);
			spyFetchTransactionsForSignature.mockResolvedValueOnce([]);
			spyFetchTransactionsForSignature.mockResolvedValueOnce([]);

			const transactions = await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(mockSignatures.length * mockSolTransactions.length);

			// The page behind the invisible one is asked for by its oldest signature, which is the only
			// cursor that actually moves the caller past it.
			expect(spyFetchSignatures).toHaveBeenCalledTimes(2);
			expect(spyFetchSignatures).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ before: last(invisiblePage)?.signature })
			);
		});

		it('should stop at the end of the history rather than at an invisible page', async () => {
			spyFetchSignatures.mockReturnValueOnce(mockSignatures).mockReturnValueOnce([]);
			spyFetchTransactionsForSignature.mockResolvedValue([]);

			const transactions = await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
			expect(spyFetchSignatures).toHaveBeenCalledTimes(2);
		});

		it('should give up after a bounded run of invisible pages', async () => {
			spyFetchSignatures.mockReturnValue(mockSolSignatureResponses(2));
			spyFetchTransactionsForSignature.mockResolvedValue([]);

			const transactions = await getSolTransactions({
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
			expect(spyFetchSignatures).toHaveBeenCalledTimes(SOLANA_MAX_SKIPPED_SIGNATURE_PAGES + 1);
		});

		it('should handle RPC errors gracefully', async () => {
			spyFetchSignatures.mockRejectedValue(mockError);

			await expect(
				getSolTransactions({
					identity: mockIdentity,
					address: mockSolAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});
	});
});
