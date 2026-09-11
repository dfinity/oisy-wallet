import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { last } from '$lib/utils/array.utils';
import * as solanaApi from '$sol/api/solana.api';
import {
	SOLANA_MAX_SKIPPED_SIGNATURE_PAGES,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { getSolSignatures, getSolTransactions } from '$sol/services/sol-signatures.services';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignaturesCursor, SolSignaturesPage } from '$sol/types/sol-api';
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
import { isNullish, nonNullish } from '@dfinity/utils';
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

		const walletSource = mockSolAddress;
		const bonkSource = mockAtaAddresses[BONK_TOKEN.address];
		const usdcSource = mockAtaAddresses[USDC_TOKEN.address];

		const atSlot = (slot: number): SolSignature => ({
			...mockSolSignatureResponse(),
			slot: BigInt(slot)
		});

		// Stands in for `getSignaturesForAddress` behind `fetchSignatures`: each source's history is
		// newest first, and `before` must be one of that source's own signatures.
		const mockHistories = (histories: Partial<Record<SolAddress, SolSignature[]>>) =>
			spyFetchSignatures.mockImplementation(
				({ wallet, before, limit }: { wallet: Address; before?: string; limit: number }) => {
					const history = histories[wallet] ?? [];

					const start = isNullish(before)
						? 0
						: history.findIndex(({ signature }) => signature === before) + 1;

					if (nonNullish(before) && start === 0) {
						throw new Error(`${before} is not in the history of ${wallet}`);
					}

					return Promise.resolve(history.slice(start, start + limit));
				}
			);

		const pageToEnd = async (
			params: Parameters<typeof getSolSignatures>[0]
		): Promise<SolSignaturesPage[]> => {
			const pages: SolSignaturesPage[] = [];

			let cursor: SolSignaturesCursor | undefined = undefined;

			for (let i = 0; i < 1_000; i++) {
				const page = await getSolSignatures({ ...params, cursor });

				pages.push(page);

				if (isNullish(page.cursor)) {
					return pages;
				}

				({ cursor } = page);
			}

			throw new Error('The pager never reached the end');
		};

		const callsFor = (source: SolAddress) =>
			spyFetchSignatures.mock.calls.filter(([{ wallet }]) => wallet === source);

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			mockHistories({});

			spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');
			spyFindAssociatedTokenPda.mockImplementation(({ mint }: { mint: Address }) =>
				Promise.resolve([mockAtaAddresses[mint.toString()]])
			);
		});

		it('should look up the wallet and the associated token account of each token', async () => {
			await getSolSignatures(mockParams);

			expect(spyFetchSignatures).toHaveBeenCalledTimes(1 + mockTokensList.length);

			[walletSource, bonkSource, usdcSource].forEach((source) => {
				expect(spyFetchSignatures).toHaveBeenCalledWith({
					network: mockNetwork,
					wallet: source,
					limit: Number(WALLET_PAGINATION)
				});
			});
		});

		it('should derive each associated token account with the program of its token', async () => {
			spyFindAssociatedTokenPda.mockResolvedValue([address(mockAtaAddress)]);

			await getSolSignatures({
				...mockParams,
				tokensList: [{ address: mockSplAddress, owner: TOKEN_2022_PROGRAM_ADDRESS }]
			});

			expect(spyFindAssociatedTokenPda).toHaveBeenCalledExactlyOnceWith({
				owner: mockSolAddress,
				tokenProgram: address(TOKEN_2022_PROGRAM_ADDRESS),
				mint: mockSplAddress
			});
		});

		it('should only look up the wallet without a token list', async () => {
			const { tokensList: _, ...params } = mockParams;

			await getSolSignatures(params);

			expect(spyFetchSignatures).toHaveBeenCalledExactlyOnceWith({
				network: mockNetwork,
				wallet: walletSource,
				limit: Number(WALLET_PAGINATION)
			});
		});

		it('should only look up the wallet with an empty token list', async () => {
			await getSolSignatures({ ...mockParams, tokensList: [] });

			expect(spyFetchSignatures).toHaveBeenCalledOnce();
		});

		it('should pass the limit to every lookup', async () => {
			await getSolSignatures({ ...mockParams, limit: 5 });

			expect(spyFetchSignatures).toHaveBeenCalledTimes(1 + mockTokensList.length);

			spyFetchSignatures.mock.calls.forEach(([params]) => {
				expect(params).toHaveProperty('limit', 5);
			});
		});

		it('should return the signatures of all sources newest first', async () => {
			const [w100, w90, a95, a85] = [atSlot(100), atSlot(90), atSlot(95), atSlot(85)];

			mockHistories({ [walletSource]: [w100, w90], [bonkSource]: [a95, a85] });

			const { signatures } = await getSolSignatures(mockParams);

			expect(signatures.map(({ signature }) => signature)).toEqual([
				w100.signature,
				a95.signature,
				w90.signature,
				a85.signature
			]);
		});

		it('should keep the order of a source for signatures of the same slot', async () => {
			const [first, second, third] = [atSlot(100), atSlot(100), atSlot(100)];

			mockHistories({ [walletSource]: [first, second, third] });

			const { signatures } = await getSolSignatures(mockParams);

			expect(signatures.map(({ signature }) => signature)).toEqual([
				first.signature,
				second.signature,
				third.signature
			]);
		});

		it('should return each signature once, tagged with every source that returned it', async () => {
			const [shared, walletOnly, bonkOnly] = [atSlot(100), atSlot(90), atSlot(80)];

			mockHistories({
				[walletSource]: [shared, walletOnly],
				[bonkSource]: [shared, bonkOnly],
				[usdcSource]: [shared]
			});

			const { signatures, cursor } = await getSolSignatures(mockParams);

			expect(signatures).toEqual([
				{ ...shared, sources: [walletSource, bonkSource, usdcSource] },
				{ ...walletOnly, sources: [walletSource] },
				{ ...bonkOnly, sources: [bonkSource] }
			]);

			expect(cursor).toBeUndefined();
		});

		it('should return everything and no cursor when no source returned a full page', async () => {
			mockHistories({ [walletSource]: [atSlot(100)], [bonkSource]: [atSlot(50)] });

			const { signatures, cursor } = await getSolSignatures({ ...mockParams, limit: 2 });

			expect(signatures).toHaveLength(2);
			expect(cursor).toBeUndefined();
		});

		it('should return nothing and no cursor when no source has any signature', async () => {
			await expect(getSolSignatures(mockParams)).resolves.toEqual({ signatures: [] });
		});

		it('should cut the page above the oldest signature of a full source, and keep the rest for the next page', async () => {
			const [w100, w92, w90, w80] = [atSlot(100), atSlot(92), atSlot(90), atSlot(80)];
			const [a95, a85] = [atSlot(95), atSlot(85)];

			mockHistories({ [walletSource]: [w100, w92, w90, w80], [bonkSource]: [a95, a85] });

			const params = { ...mockParams, tokensList: [BONK_TOKEN], limit: 3 };

			const first = await getSolSignatures(params);

			// The wallet may still hold signatures in slot 90 or between 90 and 85, so both wait.
			expect(first.signatures.map(({ signature }) => signature)).toEqual([
				w100.signature,
				a95.signature,
				w92.signature
			]);
			expect(first.cursor).toEqual({
				before: { [walletSource]: { signature: w90.signature, slot: 90n } },
				exhausted: [bonkSource],
				pending: [
					{ ...w90, sources: [walletSource] },
					{ ...a85, sources: [bonkSource] }
				]
			});

			spyFetchSignatures.mockClear();

			const second = await getSolSignatures({ ...params, cursor: first.cursor });

			expect(second.signatures.map(({ signature }) => signature)).toEqual([
				w90.signature,
				a85.signature,
				w80.signature
			]);
			expect(second.cursor).toBeUndefined();

			expect(spyFetchSignatures).toHaveBeenCalledExactlyOnceWith({
				network: mockNetwork,
				wallet: walletSource,
				before: w90.signature,
				limit: 3
			});
		});

		it('should hold back the cut slot until every source has paged past it', async () => {
			const [w100, w90a, w70] = [atSlot(100), atSlot(90), atSlot(70)];
			const [a90b, a90c, a90d, a60] = [atSlot(90), atSlot(90), atSlot(90), atSlot(60)];

			mockHistories({
				[walletSource]: [w100, w90a, w70],
				[bonkSource]: [a90b, a90c, a90d, a60]
			});

			const pages = await pageToEnd({ ...mockParams, tokensList: [BONK_TOKEN], limit: 2 });

			// Both pages of the first round end inside slot 90, and the token account still holds a
			// signature there, so slot 90 is only returned once it has paged past it.
			expect(pages.map(({ signatures }) => signatures.map(({ signature }) => signature))).toEqual([
				[w100.signature],
				[w90a.signature, a90b.signature, a90c.signature, a90d.signature, w70.signature],
				[a60.signature]
			]);
		});

		it('should tag a signature with a source that only reaches it on a later lookup, and return it once', async () => {
			const [s90a, s90b] = [atSlot(90), atSlot(90)];

			// The wallet reaches both signatures of slot 90 on its first lookup, the token account only
			// the first one of them.
			mockHistories({
				[walletSource]: [s90a, s90b, atSlot(80)],
				[bonkSource]: [atSlot(95), s90a, s90b, atSlot(70)]
			});

			const pages = await pageToEnd({ ...mockParams, tokensList: [BONK_TOKEN], limit: 2 });

			const returned = pages.flatMap(({ signatures }) => signatures);

			expect(returned).toHaveLength(5);
			expect(new Set(returned.map(({ signature }) => signature)).size).toBe(5);

			expect(returned.find(({ signature }) => signature === s90b.signature)?.sources).toEqual([
				walletSource,
				bonkSource
			]);
		});

		it('should not ask again a source that already holds signatures older than the cut', async () => {
			mockHistories({
				[walletSource]: [atSlot(100), atSlot(99), atSlot(98), atSlot(97), atSlot(96)],
				[bonkSource]: [atSlot(50), atSlot(49), atSlot(48)]
			});

			const params = { ...mockParams, tokensList: [BONK_TOKEN], limit: 2 };

			const first = await getSolSignatures(params);

			spyFetchSignatures.mockClear();

			await getSolSignatures({ ...params, cursor: first.cursor });

			expect(spyFetchSignatures).toHaveBeenCalledOnce();
			expect(callsFor(walletSource)).toHaveLength(1);
		});

		it('should return an empty page with a cursor while a source is still inside the cut slot', async () => {
			const [a100, b100, c100, d90] = [atSlot(100), atSlot(100), atSlot(100), atSlot(90)];

			mockHistories({ [walletSource]: [a100, b100, c100, d90] });

			const params = { ...mockParams, tokensList: [], limit: 2 };

			const first = await getSolSignatures(params);

			expect(first.signatures).toEqual([]);
			expect(first.cursor).toBeDefined();

			const second = await getSolSignatures({ ...params, cursor: first.cursor });

			expect(second.signatures.map(({ signature }) => signature)).toEqual([
				a100.signature,
				b100.signature,
				c100.signature
			]);
		});

		it('should not ask an exhausted source again', async () => {
			mockHistories({
				[walletSource]: Array.from({ length: 7 }, (_, i) => atSlot(100 - i)),
				[bonkSource]: [atSlot(99)],
				[usdcSource]: [atSlot(98)]
			});

			await pageToEnd({ ...mockParams, limit: 2 });

			expect(callsFor(bonkSource)).toHaveLength(1);
			expect(callsFor(usdcSource)).toHaveLength(1);
			expect(callsFor(walletSource)).toHaveLength(4);
		});

		it('should only ask each source for signatures before one of its own', async () => {
			const shared = atSlot(95);

			mockHistories({
				[walletSource]: [atSlot(100), shared, atSlot(90), atSlot(80), atSlot(70)],
				[bonkSource]: [atSlot(99), shared, atSlot(85), atSlot(75), atSlot(65)]
			});

			// The mocked lookup throws on a `before` from another source's history.
			await expect(
				pageToEnd({ ...mockParams, tokensList: [BONK_TOKEN], limit: 2 })
			).resolves.not.toHaveLength(0);
		});

		it.each([1, 2, 3, 5, 10])(
			'should yield exactly the union of every source history, newest first, when paged to the end with a limit of %s',
			async (limit) => {
				// A deterministic chain: signatures newest first, several per slot at times, each held by
				// one or more sources. Every source's history is the chain filtered to it, so the order
				// within a slot is the same in all of them, as on chain.
				let seed = 42 + limit;
				const random = (): number => {
					seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;

					return seed / 2_147_483_648;
				};

				const sources = [walletSource, bonkSource, usdcSource];

				let slot = 10_000;

				const chain = Array.from({ length: 60 }, () => {
					slot -= random() < 0.3 ? 0 : 1 + Math.floor(random() * 5);

					const holders = sources.filter(() => random() < 0.45);

					return {
						solSignature: atSlot(slot),
						holders: holders.length > 0 ? holders : [sources[Math.floor(random() * 3)]]
					};
				});

				mockHistories(
					sources.reduce<Partial<Record<SolAddress, SolSignature[]>>>(
						(acc, source) => ({
							...acc,
							[source]: chain
								.filter(({ holders }) => holders.includes(source))
								.map(({ solSignature }) => solSignature)
						}),
						{}
					)
				);

				const pages = await pageToEnd({ ...mockParams, limit });

				const returned = pages.flatMap(({ signatures }) => signatures);

				expect(returned.map(({ signature }) => signature).sort()).toEqual(
					chain.map(({ solSignature: { signature } }) => signature).sort()
				);

				returned.forEach(({ signature, sources: returnedSources }) => {
					const { holders } =
						chain.find(({ solSignature }) => solSignature.signature === signature) ?? {};

					expect([...returnedSources].sort()).toEqual([...(holders ?? [])].sort());
				});

				returned.slice(1).forEach(({ slot: returnedSlot }, i) => {
					expect(returnedSlot).toBeLessThanOrEqual(returned[i].slot);
				});
			}
		);

		it('should reject when a lookup fails, without an unhandled rejection from the others', async () => {
			const onUnhandledRejection = vi.fn();
			process.on('unhandledRejection', onUnhandledRejection);

			let rejectLater: (err: Error) => void = () => {};

			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet === walletSource
					? Promise.resolve([atSlot(100)])
					: wallet === bonkSource
						? Promise.reject(mockError)
						: new Promise((_, reject) => {
								rejectLater = reject;
							})
			);

			await expect(getSolSignatures(mockParams)).rejects.toThrow(mockError);

			rejectLater(new Error('A second failure'));

			await new Promise((resolve) => setImmediate(resolve));

			process.off('unhandledRejection', onUnhandledRejection);

			expect(onUnhandledRejection).not.toHaveBeenCalled();
		});

		it('should reject when an associated token account cannot be derived', async () => {
			spyFindAssociatedTokenPda.mockRejectedValue(mockError);

			await expect(getSolSignatures(mockParams)).rejects.toThrow(mockError);
		});

		it('should reject a page whose lookup fails after the first page', async () => {
			mockHistories({ [walletSource]: [atSlot(100), atSlot(90), atSlot(80)] });

			const { cursor } = await getSolSignatures({ ...mockParams, limit: 1 });

			spyFetchSignatures.mockRejectedValue(mockError);

			await expect(getSolSignatures({ ...mockParams, limit: 1, cursor })).rejects.toThrow(
				mockError
			);
		});

		// One flaky token account costs the whole page, wallet signatures included: pinned so the
		// refactor changes it on purpose rather than by accident.
		it('should reject when a single token account lookup fails', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress ? Promise.reject(mockError) : Promise.resolve([])
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

			await expect(result).resolves.toEqual({ signatures: [] });
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

			const slotsOf = ({ signatures }: SolSignaturesPage): bigint[] =>
				signatures.map(({ slot }) => slot);

			it('should return every signature when each source holds fewer than the limit', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 90n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([80n])
				});

				expect(slotsOf(await getSolSignatures({ ...mockParams, limit }))).toEqual([100n, 90n, 80n]);
			});

			// Was F1: the wallet page and each token account page came back concatenated.
			it('should return the signatures newest first', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 90n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([95n, 85n])
				});

				expect(slotsOf(await getSolSignatures({ ...mockParams, limit }))).toEqual([
					100n,
					95n,
					90n,
					85n
				]);
			});

			// Was F2: the page ran past the oldest wallet signature fetched. It now stops strictly above
			// the cut, the newest of the oldest signatures of the full sources (the wallet's 91).
			it('should end the page above the newest of the oldest signatures of the full sources', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 95n, 91n, 88n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([99n, 70n, 50n, 40n])
				});

				expect(slotsOf(await getSolSignatures({ ...mockParams, limit }))).toEqual([100n, 99n, 95n]);
			});

			// Was F2: a source that ran out of signatures stretched the page past the full ones.
			it('should not end the page at a source that holds fewer than the limit', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 95n, 91n, 88n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([99n, 80n])
				});

				expect(slotsOf(await getSolSignatures({ ...mockParams, limit }))).toEqual([100n, 99n, 95n]);
			});

			// Was F2: paging on from each page's oldest signature skipped wallet signatures for good.
			it('should reach every signature when paging with the cursor to the end', async () => {
				mockHistories({
					wallet: mockSolSignatureResponsesAtSlots([100n, 95n, 91n, 88n, 86n, 60n]),
					tokenAccount: mockSolSignatureResponsesAtSlots([99n, 70n, 50n, 40n])
				});

				const collected: bigint[] = [];
				let cursor: SolSignaturesCursor | undefined;

				for (let page = 0; page < 20; page++) {
					const result = await getSolSignatures({ ...mockParams, limit, cursor });

					collected.push(...slotsOf(result));

					if (isNullish(result.cursor)) {
						break;
					}

					({ cursor } = result);
				}

				expect(collected).toEqual([100n, 99n, 95n, 91n, 88n, 86n, 70n, 60n, 50n, 40n]);
			});
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
