import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { enabledSplTokens } from '$lib/derived/tokens.derived';
import { solAddressMainnetStore } from '$lib/stores/address.store';
import type { Token } from '$lib/types/token';
import { SOLANA_MAX_SKIPPED_SIGNATURE_PAGES } from '$sol/constants/sol.constants';
import {
	loadOlderSolTokenTransactions,
	loadOlderSolTransactions,
	resetSolHistoryPagers
} from '$sol/services/sol-history-pagers.services';
import {
	mapSolSourcesToTokens,
	resolveSolSignatures
} from '$sol/services/sol-resolve-signatures.services';
import { getSolSignatures } from '$sol/services/sol-signatures.services';
import { calculateAssociatedTokenAddress } from '$sol/services/spl-accounts.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import type { SolSignaturesCursor, SolSignaturesPage } from '$sol/types/sol-api';
import type { SolSignatureWithSources, SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2
} from '$tests/mocks/sol.mock';
import type { UnixTimestamp } from '@solana/kit';
import { get, type Writable } from 'svelte/store';

vi.mock('$lib/derived/tokens.derived', async () => {
	const { writable } = await import('svelte/store');

	return { enabledSplTokens: writable([]) };
});

vi.mock('$sol/derived/tokens.derived', async () => {
	const { readable } = await import('svelte/store');
	const { SOLANA_TOKEN } = await import('$env/tokens/tokens.sol.env');

	return { enabledSolanaTokens: readable([SOLANA_TOKEN]) };
});

vi.mock('$sol/services/sol-signatures.services', () => ({
	getSolSignatures: vi.fn()
}));

vi.mock('$sol/services/sol-resolve-signatures.services', () => ({
	mapSolSourcesToTokens: vi.fn(),
	resolveSolSignatures: vi.fn()
}));

vi.mock('$sol/services/spl-accounts.services', () => ({
	calculateAssociatedTokenAddress: vi.fn()
}));

vi.mock('$env/user-transactions.env', () => ({
	USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED: false
}));

describe('sol-history-pagers.services', () => {
	const wallet = mockSolAddress;
	const bonkAta = mockAtaAddress;
	const usdcAta = mockAtaAddress2;

	const splTokens = enabledSplTokens as unknown as Writable<SplToken[]>;

	const cursor = (label: string): SolSignaturesCursor => ({
		before: { [label]: { signature: mockSolSignatureResponse().signature, slot: 1n } },
		exhausted: [],
		pending: []
	});

	const signatureAt = ({
		blockTime,
		sources
	}: {
		blockTime: number;
		sources: SolAddress[];
	}): SolSignatureWithSources => ({
		...mockSolSignatureResponse(),
		blockTime: BigInt(blockTime) as UnixTimestamp,
		sources
	});

	const recordOf = ({ signature, blockTime }: SolSignatureWithSources): SolTransactionUi => ({
		...createMockSolTransactionUi(signature),
		id: signature,
		signature,
		timestamp: blockTime ?? undefined
	});

	const signaturesIn = (token: Token): string[] =>
		(get(solTransactionsStore)?.[token.id] ?? []).map(({ data: { signature } }) => signature);

	const mockPages = (...pages: SolSignaturesPage[]) =>
		pages.forEach((page) => vi.mocked(getSolSignatures).mockResolvedValueOnce(page));

	beforeEach(() => {
		vi.clearAllMocks();

		resetSolHistoryPagers();

		solAddressMainnetStore.set({ data: wallet, certified: true });
		splTokens.set([BONK_TOKEN, USDC_TOKEN]);

		[SOLANA_TOKEN, BONK_TOKEN, USDC_TOKEN].forEach(({ id }) => solTransactionsStore.reset(id));

		vi.mocked(mapSolSourcesToTokens).mockResolvedValue(
			new Map([
				[wallet, null],
				[bonkAta, BONK_TOKEN.address],
				[usdcAta, USDC_TOKEN.address]
			])
		);

		vi.mocked(calculateAssociatedTokenAddress).mockResolvedValue(bonkAta);

		vi.mocked(resolveSolSignatures).mockImplementation(({ signatures, known }) =>
			Promise.resolve(
				signatures
					.filter(({ signature }) => !(known?.has(signature) ?? false))
					.map((signature) => ({ transaction: recordOf(signature), sources: signature.sources }))
			)
		);
	});

	describe('loadOlderSolTransactions', () => {
		const load = ({
			token = SOLANA_TOKEN,
			minTimestamp,
			signalEnd = vi.fn()
		}: {
			token?: Token;
			minTimestamp?: number;
			signalEnd?: () => void;
		} = {}) =>
			loadOlderSolTransactions({
				token,
				identity: mockIdentity,
				signalEnd,
				...(minTimestamp !== undefined && { minTimestamp })
			});

		it('should page the wallet and every token account of the network together', async () => {
			mockPages({ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })] });

			await load();

			expect(getSolSignatures).toHaveBeenCalledExactlyOnceWith({
				address: wallet,
				network: 'mainnet',
				tokensList: [BONK_TOKEN, USDC_TOKEN],
				cursor: undefined
			});
		});

		it('should resume from its own cursor, never from what the store holds', async () => {
			const firstCursor = cursor('first');

			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })], cursor: firstCursor },
				{ signatures: [signatureAt({ blockTime: 90, sources: [wallet] })], cursor: cursor('next') }
			);

			await load();

			// Something older lands in the store from elsewhere, such as the IndexedDB cache.
			const older = signatureAt({ blockTime: 10, sources: [wallet] });
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN.id,
				transactions: [{ data: recordOf(older), certified: false }]
			});

			await load();

			expect(getSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ cursor: firstCursor })
			);
		});

		it('should share the page in flight between the tokens of a network', async () => {
			mockPages({
				signatures: [signatureAt({ blockTime: 100, sources: [wallet, bonkAta] })],
				cursor: cursor('next')
			});

			const [sol, bonk] = await Promise.all([load(), load({ token: BONK_TOKEN })]);

			expect(sol).toEqual({ success: true });
			expect(bonk).toEqual({ success: true });
			expect(getSolSignatures).toHaveBeenCalledOnce();
		});

		it('should hand a record with three sources to the three tokens, once each', async () => {
			const swap = signatureAt({ blockTime: 100, sources: [wallet, bonkAta, usdcAta] });

			mockPages({ signatures: [swap], cursor: cursor('next') }, { signatures: [swap] });

			await load();
			await load();

			expect(resolveSolSignatures).toHaveBeenCalledTimes(2);
			expect(signaturesIn(SOLANA_TOKEN)).toEqual([swap.signature]);
			expect(signaturesIn(BONK_TOKEN)).toEqual([swap.signature]);
			expect(signaturesIn(USDC_TOKEN)).toEqual([swap.signature]);
		});

		it('should derive a record one token holds again, with every account, before handing it to the others', async () => {
			const swap = signatureAt({ blockTime: 100, sources: [wallet, usdcAta] });

			// As the worker derives it: with the wallet only, so it may miss what moved in USDC.
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN.id,
				transactions: [{ data: { ...recordOf(swap), value: 1n }, certified: false }]
			});

			vi.mocked(resolveSolSignatures).mockImplementation(({ signatures }) =>
				Promise.resolve(
					signatures.map((signature) => ({
						transaction: { ...recordOf(signature), value: 2n },
						sources: signature.sources
					}))
				)
			);

			mockPages({ signatures: [swap], cursor: cursor('next') });

			await load();

			expect(resolveSolSignatures).toHaveBeenCalledExactlyOnceWith({
				address: wallet,
				network: 'mainnet',
				tokens: [BONK_TOKEN, USDC_TOKEN],
				signatures: [swap],
				known: new Set()
			});

			const valuesIn = (token: Token) =>
				(get(solTransactionsStore)?.[token.id] ?? []).map(({ data: { value } }) => value);

			expect(valuesIn(SOLANA_TOKEN)).toEqual([2n]);
			expect(valuesIn(USDC_TOKEN)).toEqual([2n]);
			expect(signaturesIn(BONK_TOKEN)).toEqual([]);
		});

		it('should skip a signature every token it belongs to already holds', async () => {
			const swap = signatureAt({ blockTime: 100, sources: [wallet, usdcAta] });

			[SOLANA_TOKEN, USDC_TOKEN].forEach(({ id }) =>
				solTransactionsStore.append({
					tokenId: id,
					transactions: [{ data: recordOf(swap), certified: false }]
				})
			);

			mockPages({ signatures: [swap], cursor: cursor('next') });

			await load();

			expect(resolveSolSignatures).toHaveBeenCalledWith(
				expect.objectContaining({ known: new Set([swap.signature]) })
			);
			expect(signaturesIn(SOLANA_TOKEN)).toEqual([swap.signature]);
			expect(signaturesIn(USDC_TOKEN)).toEqual([swap.signature]);
		});

		it('should signal the end to every token of the network', async () => {
			const solEnd = vi.fn();
			const bonkEnd = vi.fn();
			const usdcEnd = vi.fn();

			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })], cursor: cursor('a') },
				{ signatures: [signatureAt({ blockTime: 90, sources: [bonkAta] })] }
			);

			await load({ signalEnd: solEnd });
			await load({ token: BONK_TOKEN, signalEnd: bonkEnd });

			expect(solEnd).toHaveBeenCalledOnce();
			expect(bonkEnd).toHaveBeenCalledOnce();

			// A token that had not paged yet learns about the end without a fetch.
			await expect(load({ token: USDC_TOKEN, signalEnd: usdcEnd })).resolves.toEqual({
				success: false
			});

			expect(usdcEnd).toHaveBeenCalledOnce();
			expect(getSolSignatures).toHaveBeenCalledTimes(2);
		});

		it('should stop at the floor, checked against the oldest signature the pager returned', async () => {
			mockPages({
				signatures: [signatureAt({ blockTime: 50, sources: [wallet] })],
				cursor: cursor('next')
			});

			await expect(load({ minTimestamp: 60 })).resolves.toEqual({ success: true });
			await expect(load({ minTimestamp: 60 })).resolves.toEqual({ success: false });

			expect(getSolSignatures).toHaveBeenCalledOnce();
		});

		it('should keep the oldest block time across pages, which are not ordered by it', async () => {
			mockPages(
				{ signatures: [signatureAt({ blockTime: 50, sources: [wallet] })], cursor: cursor('a') },
				{ signatures: [signatureAt({ blockTime: 80, sources: [wallet] })], cursor: cursor('b') }
			);

			await load();
			await load();

			await expect(load({ minTimestamp: 60 })).resolves.toEqual({ success: false });

			expect(getSolSignatures).toHaveBeenCalledTimes(2);
		});

		it('should take a signature without a block time as zero for the floor', async () => {
			mockPages({
				signatures: [{ ...signatureAt({ blockTime: 100, sources: [wallet] }), blockTime: null }],
				cursor: cursor('next')
			});

			await expect(load({ minTimestamp: 60 })).resolves.toEqual({ success: true });
			await expect(load({ minTimestamp: 60 })).resolves.toEqual({ success: false });

			expect(getSolSignatures).toHaveBeenCalledOnce();
		});

		it('should page again without a floor, which is how the floor gets deeper', async () => {
			mockPages(
				{ signatures: [signatureAt({ blockTime: 50, sources: [wallet] })], cursor: cursor('a') },
				{ signatures: [signatureAt({ blockTime: 40, sources: [wallet] })], cursor: cursor('b') }
			);

			await load({ minTimestamp: 60 });
			await load();

			expect(getSolSignatures).toHaveBeenCalledTimes(2);
		});

		it('should not take an empty page with a cursor for the end', async () => {
			const signalEnd = vi.fn();
			const record = signatureAt({ blockTime: 100, sources: [wallet] });

			mockPages(
				{ signatures: [], cursor: cursor('crowded') },
				{ signatures: [record], cursor: cursor('next') }
			);

			await expect(load({ signalEnd })).resolves.toEqual({ success: true });

			expect(getSolSignatures).toHaveBeenCalledTimes(2);
			expect(signalEnd).not.toHaveBeenCalled();
			expect(signaturesIn(SOLANA_TOKEN)).toEqual([record.signature]);
		});

		it('should bound the pages one call walks through while nothing new arrives', async () => {
			const signalEnd = vi.fn();

			vi.mocked(getSolSignatures).mockResolvedValue({ signatures: [], cursor: cursor('crowded') });

			await expect(load({ signalEnd })).resolves.toEqual({ success: true });

			expect(getSolSignatures).toHaveBeenCalledTimes(SOLANA_MAX_SKIPPED_SIGNATURE_PAGES + 1);
			expect(signalEnd).not.toHaveBeenCalled();
		});

		it('should report a failed page without signalling the end, and retry the same page', async () => {
			const signalEnd = vi.fn();
			const firstCursor = cursor('first');

			mockPages({
				signatures: [signatureAt({ blockTime: 100, sources: [wallet] })],
				cursor: firstCursor
			});
			vi.mocked(getSolSignatures).mockRejectedValueOnce(new Error('RPC down'));
			mockPages({ signatures: [signatureAt({ blockTime: 90, sources: [wallet] })] });

			await load({ signalEnd });

			await expect(load({ signalEnd })).resolves.toEqual({
				success: false,
				err: new Error('RPC down')
			});

			expect(signalEnd).not.toHaveBeenCalled();

			await load({ signalEnd });

			expect(getSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ cursor: firstCursor })
			);
		});

		it('should report a failed resolution without signalling the end', async () => {
			const signalEnd = vi.fn();

			mockPages({ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })] });
			vi.mocked(resolveSolSignatures).mockRejectedValueOnce(new Error('RPC down'));

			await expect(load({ signalEnd })).resolves.toEqual({
				success: false,
				err: new Error('RPC down')
			});

			expect(signalEnd).not.toHaveBeenCalled();
		});

		it('should start over when the address changes', async () => {
			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })], cursor: cursor('a') },
				{ signatures: [signatureAt({ blockTime: 100, sources: [mockSolAddress2] })] }
			);

			await load();

			solAddressMainnetStore.set({ data: mockSolAddress2, certified: true });

			await load();

			expect(getSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ address: mockSolAddress2, cursor: undefined })
			);
		});

		it('should start over when the token list of the network changes', async () => {
			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })], cursor: cursor('a') },
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })] }
			);

			await load();

			splTokens.set([BONK_TOKEN]);

			await load();

			expect(getSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ tokensList: [BONK_TOKEN], cursor: undefined })
			);
		});

		it('should not let a page asked for before the address changed touch the pager that replaced it', async () => {
			const signalEnd = vi.fn();
			const stale = signatureAt({ blockTime: 100, sources: [wallet] });
			const nextCursor = cursor('next');

			let answerStalePage: (page: SolSignaturesPage) => void = () => {};

			vi.mocked(getSolSignatures).mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						answerStalePage = resolve;
					})
			);
			mockPages(
				{
					signatures: [signatureAt({ blockTime: 100, sources: [mockSolAddress2] })],
					cursor: nextCursor
				},
				{ signatures: [signatureAt({ blockTime: 90, sources: [mockSolAddress2] })] }
			);

			const stalePage = load({ signalEnd });

			solAddressMainnetStore.set({ data: mockSolAddress2, certified: true });
			vi.mocked(mapSolSourcesToTokens).mockResolvedValue(
				new Map([
					[wallet, null],
					[mockSolAddress2, null]
				])
			);

			await load({ signalEnd });

			// The last page of the old wallet's history, which would end its pager.
			answerStalePage({ signatures: [stale] });

			await expect(stalePage).resolves.toEqual({ success: true });

			expect(signalEnd).not.toHaveBeenCalled();
			expect(signaturesIn(SOLANA_TOKEN)).not.toContain(stale.signature);

			await load({ signalEnd });

			expect(getSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ address: mockSolAddress2, cursor: nextCursor })
			);
		});

		it('should not page without an address', async () => {
			solAddressMainnetStore.reset();

			await expect(load()).resolves.toEqual({ success: false });

			expect(getSolSignatures).not.toHaveBeenCalled();
		});
	});

	describe('loadOlderSolTokenTransactions', () => {
		const load = ({ token, signalEnd = vi.fn() }: { token: Token; signalEnd?: () => void }) =>
			loadOlderSolTokenTransactions({ token, identity: mockIdentity, signalEnd });

		it('should page an SPL token over its own token account only', async () => {
			mockPages({ signatures: [signatureAt({ blockTime: 100, sources: [bonkAta] })] });

			await load({ token: BONK_TOKEN });

			expect(getSolSignatures).toHaveBeenCalledExactlyOnceWith({
				address: bonkAta,
				network: 'mainnet',
				tokensList: [],
				cursor: undefined
			});
		});

		it('should page SOL over the wallet only', async () => {
			mockPages({ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })] });

			await load({ token: SOLANA_TOKEN });

			expect(getSolSignatures).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ address: wallet, tokensList: [] })
			);
		});

		it('should write what it finds to that token only', async () => {
			const swap = signatureAt({ blockTime: 100, sources: [bonkAta] });

			mockPages({ signatures: [swap], cursor: cursor('next') });

			await load({ token: BONK_TOKEN });

			expect(signaturesIn(BONK_TOKEN)).toEqual([swap.signature]);
			expect(signaturesIn(SOLANA_TOKEN)).toEqual([]);
			expect(signaturesIn(USDC_TOKEN)).toEqual([]);
		});

		it('should keep one cursor per token', async () => {
			const bonkCursor = cursor('bonk');

			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [bonkAta] })], cursor: bonkCursor },
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })], cursor: cursor('sol') },
				{ signatures: [signatureAt({ blockTime: 90, sources: [bonkAta] })], cursor: cursor('b2') }
			);

			await load({ token: BONK_TOKEN });
			await load({ token: SOLANA_TOKEN });
			await load({ token: BONK_TOKEN });

			expect(getSolSignatures).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ address: wallet, cursor: undefined })
			);
			expect(getSolSignatures).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({ address: bonkAta, cursor: bonkCursor })
			);
		});

		it('should signal the end to that token only', async () => {
			const bonkEnd = vi.fn();
			const solEnd = vi.fn();

			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [bonkAta] })] },
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })], cursor: cursor('sol') }
			);

			await load({ token: BONK_TOKEN, signalEnd: bonkEnd });
			await load({ token: SOLANA_TOKEN, signalEnd: solEnd });

			expect(bonkEnd).toHaveBeenCalledOnce();
			expect(solEnd).not.toHaveBeenCalled();
		});

		it('should start over when the address changes', async () => {
			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [wallet] })], cursor: cursor('a') },
				{ signatures: [signatureAt({ blockTime: 100, sources: [mockSolAddress2] })] }
			);

			await load({ token: SOLANA_TOKEN });

			solAddressMainnetStore.set({ data: mockSolAddress2, certified: true });

			await load({ token: SOLANA_TOKEN });

			expect(getSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ address: mockSolAddress2, cursor: undefined })
			);
		});

		it('should start over when the token list of the network changes', async () => {
			mockPages(
				{ signatures: [signatureAt({ blockTime: 100, sources: [bonkAta] })], cursor: cursor('a') },
				{ signatures: [signatureAt({ blockTime: 90, sources: [bonkAta] })] }
			);

			await load({ token: BONK_TOKEN });

			splTokens.set([BONK_TOKEN]);

			await load({ token: BONK_TOKEN });

			expect(getSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ address: bonkAta, cursor: undefined })
			);
			expect(resolveSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ tokens: [BONK_TOKEN] })
			);
		});

		it('should derive a record another token holds again rather than reuse it', async () => {
			const swap = signatureAt({ blockTime: 100, sources: [bonkAta] });

			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN.id,
				transactions: [{ data: recordOf(swap), certified: false }]
			});

			mockPages({ signatures: [swap], cursor: cursor('next') });

			await load({ token: BONK_TOKEN });

			expect(resolveSolSignatures).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ tokens: [BONK_TOKEN, USDC_TOKEN], known: new Set() })
			);
			expect(signaturesIn(BONK_TOKEN)).toEqual([swap.signature]);
		});
	});
});
