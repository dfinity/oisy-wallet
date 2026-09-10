import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import * as solanaApi from '$sol/api/solana.api';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { getSolSignatures } from '$sol/services/sol-signatures.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignaturesCursor, SolSignaturesPage } from '$sol/types/sol-api';
import type { SolSignature } from '$sol/types/sol-transaction';
import type { RequiredSplToken, SplTokenAddress } from '$sol/types/spl';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { isNullish, nonNullish } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import { address, type Address } from '@solana/kit';
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
	});
});
