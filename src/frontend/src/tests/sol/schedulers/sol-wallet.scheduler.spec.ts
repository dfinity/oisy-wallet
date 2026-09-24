import { SOL_WALLET_TIMER_INTERVAL_MILLIS, WALLET_PAGINATION } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { PostMessageDataRequestSol } from '$lib/types/post-message';
import { fetchSignatures } from '$sol/api/solana.api';
import {
	SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { SolWalletScheduler } from '$sol/schedulers/sol-wallet.scheduler';
import { loadSolNetworkBalances } from '$sol/services/sol-balances.services';
import {
	mapSolSourcesToTokens,
	resolveSolSignatures
} from '$sol/services/sol-resolve-signatures.services';
import { getSolSignatures } from '$sol/services/sol-signatures.services';
import { saveSolFinalizedTransactions } from '$sol/services/sol-user-transactions.services';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignaturesCursor } from '$sol/types/sol-api';
import type { SolNetworkBalances } from '$sol/types/sol-balance';
import type { SolResolvedTransaction, SolSignatureWithSources } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { isNullish, jsonReviver, nonNullish } from '@dfinity/utils';

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
}));

vi.mock('$env/user-transactions.env', () => ({
	USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED: true
}));

vi.mock('$sol/services/sol-user-transactions.services', () => ({
	saveSolFinalizedTransactions: vi.fn()
}));

vi.mock('$sol/services/sol-balances.services', () => ({
	loadSolNetworkBalances: vi.fn()
}));

vi.mock(import('$sol/api/solana.api'), async (importOriginal) => ({
	...(await importOriginal()),
	fetchSignatures: vi.fn()
}));

vi.mock(import('$sol/services/sol-signatures.services'), async (importOriginal) => ({
	...(await importOriginal()),
	getSolSignatures: vi.fn()
}));

vi.mock('$sol/services/sol-resolve-signatures.services', () => ({
	mapSolSourcesToTokens: vi.fn(),
	resolveSolSignatures: vi.fn()
}));

vi.mock('$lib/providers/auth-client.providers', async (importActual) => {
	const authClientProvider = vi.fn().mockReturnValue({
		loadIdentity: vi.fn()
	});

	return {
		...(await importActual()),
		AuthClientProvider: Object.assign(authClientProvider, {
			getInstance: authClientProvider
		})
	};
});

describe('sol-wallet.scheduler', () => {
	const mint: SplTokenAddress = mockSplAddress;
	const mint2: SplTokenAddress = mockSolAddress2;

	const tokens = [
		{ address: mint, owner: TOKEN_PROGRAM_ADDRESS },
		{ address: mint2, owner: TOKEN_2022_PROGRAM_ADDRESS }
	];

	const data: PostMessageDataRequestSol = {
		address: { data: mockSolAddress, certified: false },
		solanaNetwork: SolanaNetworks.mainnet,
		tokens
	};

	const sourceTokens = new Map<SolAddress, SplTokenAddress | null>([
		[mockSolAddress, null],
		[mockAtaAddress, mint],
		[mockAtaAddress2, mint2]
	]);

	const mockBalances: SolNetworkBalances = { sol: 100n, spl: { [mint]: 5n, [mint2]: 7n } };

	const signatureAt = ({
		slot,
		sources = [mockSolAddress]
	}: {
		slot: bigint;
		sources?: SolAddress[];
	}): SolSignatureWithSources => ({ ...mockSolSignatureResponse(), slot, sources });

	const toResolved = (signatures: SolSignatureWithSources[]): SolResolvedTransaction[] =>
		signatures.map(({ signature, sources }) => ({
			transaction: { ...createMockSolTransactionUi(signature), signature },
			sources
		}));

	const newestSignature = signatureAt({ slot: 101n });
	const olderSignature = signatureAt({ slot: 100n, sources: [mockAtaAddress] });
	const page = [newestSignature, olderSignature];

	const mockPostMessageStatusInProgress = {
		msg: 'syncSolWalletStatus',
		data: { state: 'in_progress' }
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncSolWalletStatus',
		data: { state: 'idle' }
	};

	const postMessageMock = vi.fn();

	let originalPostMessage: unknown;

	let scheduler: SolWalletScheduler;

	const walletPosts = () =>
		postMessageMock.mock.calls
			.map(([message]) => message)
			.filter(({ msg }) => msg === 'syncSolWallet');

	const postedTransactions = (post: {
		data: { wallet: { newTransactions: string } };
	}): SolResolvedTransaction[] => JSON.parse(post.data.wallet.newTransactions, jsonReviver);

	const mockPage = (signatures: SolSignatureWithSources[]) =>
		vi.mocked(getSolSignatures).mockResolvedValue({ signatures });

	const historyPageSize = 2;

	// Pages through `history` like the merged pager: a cursor continues after the oldest signature of
	// its page, so it stays valid when newer signatures arrive on top.
	const mockHistory = (history: SolSignatureWithSources[]) =>
		vi.mocked(getSolSignatures).mockImplementation(({ cursor }) => {
			const start = isNullish(cursor)
				? 0
				: history.findIndex(
						({ signature }) => signature === cursor.before[mockSolAddress]?.signature
					) + 1;

			const signatures = history.slice(start, start + historyPageSize);
			const oldest = signatures[signatures.length - 1];

			return Promise.resolve({
				signatures,
				cursor:
					start + historyPageSize < history.length && nonNullish(oldest)
						? {
								before: { [mockSolAddress]: { signature: oldest.signature, slot: oldest.slot } },
								exhausted: [],
								pending: []
							}
						: undefined
			});
		});

	const signaturesFrom = ({ slot, count }: { slot: bigint; count: number }) =>
		Array.from({ length: count }, (_, index) => signatureAt({ slot: slot - BigInt(index) }));

	const postedSignatures = (): string[] =>
		walletPosts()
			.flatMap(postedTransactions)
			.map(({ transaction: { signature } }) => signature);

	const signaturesOf = (signatures: SolSignatureWithSources[]): string[] =>
		signatures.map(({ signature }) => signature);

	// The first job runs without being awaited by `start`, so the timers are advanced to let it end.
	const awaitJobExecution = () =>
		vi.advanceTimersByTimeAsync(SOL_WALLET_TIMER_INTERVAL_MILLIS - 100);

	// Retries wait between attempts, so a trigger that retries needs the timers run to settle.
	const triggerAndSettle = async (triggerData: PostMessageDataRequestSol = data) => {
		const promise = scheduler.trigger(triggerData);

		await vi.runAllTimersAsync();

		await promise;
	};

	beforeAll(() => {
		originalPostMessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockAuthStore();

		vi.mocked(AuthClientProvider.getInstance().loadIdentity).mockResolvedValue(mockIdentity);

		vi.mocked(loadSolNetworkBalances).mockResolvedValue(mockBalances);
		mockPage(page);
		vi.mocked(resolveSolSignatures).mockImplementation(({ signatures }) =>
			Promise.resolve(toResolved(signatures))
		);
		vi.mocked(mapSolSourcesToTokens).mockResolvedValue(sourceTokens);
		vi.mocked(saveSolFinalizedTransactions).mockResolvedValue({ success: true });

		scheduler = new SolWalletScheduler();
	});

	afterEach(() => {
		scheduler.stop();

		vi.useRealTimers();
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostMessage;
	});

	describe('timer', () => {
		it('should post one wallet message per tick, between the status messages', async () => {
			await scheduler.start(data);

			await awaitJobExecution();

			expect(postMessageMock).toHaveBeenCalledTimes(3);
			expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(2, {
				msg: 'syncSolWallet',
				ref: SolanaNetworks.mainnet,
				data: {
					wallet: {
						balances: mockBalances,
						newTransactions: expect.any(String)
					}
				}
			});
			expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(SOL_WALLET_TIMER_INTERVAL_MILLIS);

			// Nothing new: status messages only.
			expect(postMessageMock).toHaveBeenCalledTimes(5);
			expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusIdle);
		});

		// The worker replaces its scheduler without awaiting the start of the one it replaces.
		it('should never start the timer of a scheduler stopped while it loads the identity', async () => {
			let resolveIdentity: (identity: typeof mockIdentity) => void = () => {};

			vi.mocked(AuthClientProvider.getInstance().loadIdentity).mockReturnValueOnce(
				new Promise((resolve) => (resolveIdentity = resolve))
			);

			const replaced = new SolWalletScheduler();

			const replacedStart = replaced.start(data);

			replaced.stop();

			const changedData = { ...data, tokens: [tokens[0]] };

			await scheduler.start(changedData);

			resolveIdentity(mockIdentity);

			await replacedStart;

			await vi.advanceTimersByTimeAsync(SOL_WALLET_TIMER_INTERVAL_MILLIS * 2);

			expect(replaced['timer']['timer']).toBeUndefined();
			expect(scheduler['timer']['timer']).toBeDefined();

			expect(getSolSignatures).toHaveBeenCalledTimes(3);

			vi.mocked(getSolSignatures).mock.calls.forEach(([params]) =>
				expect(params.tokensList).toEqual(changedData.tokens)
			);
		});

		it('should start the scheduler with an interval', async () => {
			await scheduler.start(data);

			expect(scheduler['timer']['timer']).toBeDefined();
		});

		it('should stop the scheduler', async () => {
			await scheduler.start(data);

			scheduler.stop();

			expect(scheduler['timer']['timer']).toBeUndefined();
		});

		it('should load every balance of the network with one call per tick', async () => {
			await scheduler.start(data);

			await vi.advanceTimersByTimeAsync(SOL_WALLET_TIMER_INTERVAL_MILLIS * 2);

			expect(loadSolNetworkBalances).toHaveBeenCalledTimes(3);
			expect(loadSolNetworkBalances).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokens
			});
		});

		it('should look up the newest page of every source once per tick', async () => {
			await scheduler.start(data);

			await vi.advanceTimersByTimeAsync(SOL_WALLET_TIMER_INTERVAL_MILLIS * 2);

			expect(getSolSignatures).toHaveBeenCalledTimes(3);

			vi.mocked(getSolSignatures).mock.calls.forEach(([params]) =>
				expect(params).toEqual({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet,
					tokensList: tokens
				})
			);
		});
	});

	describe('head check', () => {
		it('should resolve the whole first page when it holds nothing yet', async () => {
			await scheduler.trigger(data);

			expect(resolveSolSignatures).toHaveBeenCalledExactlyOnceWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokens,
				signatures: page,
				known: new Set()
			});

			const [post] = walletPosts();

			expect(postedTransactions(post)).toEqual(toResolved(page));
		});

		it('should resolve nothing when no signature is newer than the newest it holds', async () => {
			await scheduler.trigger(data);

			postMessageMock.mockClear();

			await scheduler.trigger(data);

			expect(resolveSolSignatures).toHaveBeenCalledOnce();
			expect(walletPosts()).toHaveLength(0);
		});

		it('should resolve only the signatures newer than the newest it holds', async () => {
			await scheduler.trigger(data);

			const newSignature = signatureAt({ slot: 102n });
			mockPage([newSignature, ...page]);
			postMessageMock.mockClear();

			await scheduler.trigger(data);

			expect(resolveSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({
					signatures: [newSignature],
					known: new Set([newestSignature.signature])
				})
			);

			const [post] = walletPosts();

			expect(postedTransactions(post)).toEqual(toResolved([newSignature]));
		});

		// Older history is for the pagers, which keep their own cursors.
		it('should not resolve an older signature it does not hold', async () => {
			await scheduler.trigger(data);

			mockPage([...page, signatureAt({ slot: 99n })]);

			await scheduler.trigger(data);

			expect(resolveSolSignatures).toHaveBeenCalledOnce();
		});

		it('should resolve a signature of its newest slot that it has not seen yet', async () => {
			await scheduler.trigger(data);

			const sameSlotSignature = signatureAt({ slot: 101n, sources: [mockAtaAddress2] });
			mockPage([newestSignature, sameSlotSignature, olderSignature]);

			await scheduler.trigger(data);

			expect(resolveSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ signatures: [sameSlotSignature] })
			);
		});

		// Everything below the newest slot is old whatever it holds, so a long session does not pile
		// up the signatures of every slot it went through.
		it('should remember only the signatures of its newest slot, and resolve the same', async () => {
			const remembered = () => new Set(scheduler['store'].signatures.keys());

			await scheduler.trigger(data);

			expect(remembered()).toEqual(new Set([newestSignature.signature]));

			const sameSlotSignature = signatureAt({ slot: 101n, sources: [mockAtaAddress2] });
			mockPage([newestSignature, sameSlotSignature, olderSignature]);

			await scheduler.trigger(data);

			expect(remembered()).toEqual(
				new Set([newestSignature.signature, sameSlotSignature.signature])
			);

			const newerSignature = signatureAt({ slot: 102n });
			mockPage([newerSignature, newestSignature, sameSlotSignature, olderSignature]);

			await scheduler.trigger(data);

			expect(remembered()).toEqual(new Set([newerSignature.signature]));
			expect(resolveSolSignatures).toHaveBeenCalledTimes(3);
			expect(resolveSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ signatures: [newerSignature] })
			);

			await scheduler.trigger(data);

			expect(resolveSolSignatures).toHaveBeenCalledTimes(3);
		});

		it('should resolve a signature returned by the wallet and two token accounts once, with all its sources', async () => {
			const shared = signatureAt({
				slot: 101n,
				sources: [mockSolAddress, mockAtaAddress, mockAtaAddress2]
			});
			mockPage([shared]);

			await scheduler.trigger(data);

			expect(resolveSolSignatures).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ signatures: [shared] })
			);

			const [post] = walletPosts();

			expect(postedTransactions(post)).toEqual(toResolved([shared]));
		});

		// What a tick holds is committed only once it succeeded, so a retry resolves the page again
		// rather than dropping it.
		it('should see the same signatures as new again when a tick is retried', async () => {
			vi.mocked(loadSolNetworkBalances).mockRejectedValueOnce(new Error('Failed to fetch'));

			await triggerAndSettle();

			expect(resolveSolSignatures).toHaveBeenCalledTimes(2);

			const posts = walletPosts();

			expect(posts).toHaveLength(1);
			expect(postedTransactions(posts[0])).toEqual(toResolved(page));
		});
	});

	describe('head check across pages', () => {
		// More pages than one tick reads, on top of what the first tick holds.
		const burst = signaturesFrom({
			slot: 200n,
			count: historyPageSize * SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK * 2
		});

		const readInOneTick = historyPageSize * SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK;

		// Older history belongs to the pagers.
		it('should read only the first page when it holds nothing yet', async () => {
			const history = signaturesFrom({ slot: 110n, count: historyPageSize * 3 });
			mockHistory(history);

			await scheduler.trigger(data);

			expect(getSolSignatures).toHaveBeenCalledExactlyOnceWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokensList: tokens
			});
			expect(postedSignatures()).toEqual(signaturesOf(history.slice(0, historyPageSize)));
		});

		it('should load a burst of more than a page within one tick', async () => {
			await scheduler.trigger(data);

			const pagesBurst = signaturesFrom({
				slot: 150n,
				count: historyPageSize * (SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK - 1)
			});
			mockHistory([...pagesBurst, ...page]);
			vi.mocked(getSolSignatures).mockClear();
			postMessageMock.mockClear();

			await scheduler.trigger(data);

			// Every page of the burst, and the one that reaches what it holds.
			expect(getSolSignatures).toHaveBeenCalledTimes(SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK);
			expect(resolveSolSignatures).toHaveBeenLastCalledWith(
				expect.objectContaining({ signatures: pagesBurst })
			);
			expect(postedSignatures()).toEqual(signaturesOf(pagesBurst));
		});

		it('should stop paging once it reaches the newest signature it holds', async () => {
			const older = signaturesFrom({ slot: 99n, count: historyPageSize * 3 });
			mockHistory([...page, ...older]);

			await scheduler.trigger(data);

			const newSignatures = signaturesFrom({ slot: 103n, count: historyPageSize });
			mockHistory([...newSignatures, ...page, ...older]);
			vi.mocked(getSolSignatures).mockClear();
			postMessageMock.mockClear();

			await scheduler.trigger(data);

			expect(getSolSignatures).toHaveBeenCalledTimes(2);
			expect(postedSignatures()).toEqual(signaturesOf(newSignatures));
		});

		it('should complete a burst bigger than a tick on the next ticks, missing and repeating nothing', async () => {
			await scheduler.trigger(data);

			mockHistory([...burst, ...page]);
			vi.mocked(getSolSignatures).mockClear();
			postMessageMock.mockClear();

			await scheduler.trigger(data);

			expect(getSolSignatures).toHaveBeenCalledTimes(SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK);
			expect(postedSignatures()).toEqual(signaturesOf(burst.slice(0, readInOneTick)));

			await scheduler.trigger(data);
			await scheduler.trigger(data);

			expect(postedSignatures()).toEqual(signaturesOf(burst));

			// Caught up, a tick is back to one page.
			vi.mocked(getSolSignatures).mockClear();
			postMessageMock.mockClear();

			await scheduler.trigger(data);

			expect(getSolSignatures).toHaveBeenCalledOnce();
			expect(walletPosts()).toHaveLength(0);
		});

		it('should not skip a burst that arrives while it is catching up', async () => {
			await scheduler.trigger(data);

			mockHistory([...burst, ...page]);

			await scheduler.trigger(data);

			const nextBurst = signaturesFrom({ slot: 300n, count: historyPageSize * 2 });
			mockHistory([...nextBurst, ...burst, ...page]);
			postMessageMock.mockClear();

			await scheduler.trigger(data);
			await scheduler.trigger(data);

			const expected = signaturesOf([...nextBurst, ...burst.slice(readInOneTick)]);
			const posted = postedSignatures();

			expect(posted).toHaveLength(expected.length);
			expect(new Set(posted)).toEqual(new Set(expected));

			vi.mocked(getSolSignatures).mockClear();

			await scheduler.trigger(data);

			expect(getSolSignatures).toHaveBeenCalledOnce();
		});

		it('should resume from the same place when a tick is retried', async () => {
			await scheduler.trigger(data);

			mockHistory([...burst, ...page]);

			await scheduler.trigger(data);

			vi.mocked(loadSolNetworkBalances).mockRejectedValueOnce(new Error('Failed to fetch'));
			postMessageMock.mockClear();

			await triggerAndSettle();
			await scheduler.trigger(data);

			expect(postedSignatures()).toEqual(signaturesOf(burst.slice(readInOneTick)));
		});

		it('should drop what it has left to catch up when triggered for another token list', async () => {
			await scheduler.trigger(data);

			mockHistory([...burst, ...page]);

			await scheduler.trigger(data);

			const changedData = { ...data, tokens: [tokens[0]] };
			vi.mocked(getSolSignatures).mockClear();

			await scheduler.trigger(changedData);
			await scheduler.trigger(changedData);

			// A first page for the new token list, then a head page that reaches it.
			expect(getSolSignatures).toHaveBeenCalledTimes(2);

			vi.mocked(getSolSignatures).mock.calls.forEach(([{ cursor }]) =>
				expect(cursor).toBeUndefined()
			);
		});
	});

	// The merged pager as it is, over a wallet whose history `fetchSignatures` serves: the cut, the
	// signatures it holds back in its cursor and its empty pages are the pager's own, not a mock's.
	describe('head check with the merged pager', () => {
		const pagerLimit = Number(WALLET_PAGINATION);

		// The wallet is the only source, so the pager derives no token account.
		const walletOnly: PostMessageDataRequestSol = { ...data, tokens: [] };

		const held = signatureAt({ slot: 100n });

		const mockWalletHistory = async (history: SolSignatureWithSources[]) => {
			const { getSolSignatures: pager } = await vi.importActual<{
				getSolSignatures: typeof getSolSignatures;
			}>('$sol/services/sol-signatures.services');

			vi.mocked(getSolSignatures).mockImplementation(pager);

			vi.mocked(fetchSignatures).mockImplementation(({ before, limit }) => {
				const start = isNullish(before)
					? 0
					: history.findIndex(({ signature }) => signature === before) + 1;

				return Promise.resolve(
					history.slice(start, start + limit).map(({ sources: _, ...solSignature }) => solSignature)
				);
			});
		};

		const headCursors = () => vi.mocked(getSolSignatures).mock.calls.map(([{ cursor }]) => cursor);

		beforeEach(async () => {
			await mockWalletHistory([held]);

			await scheduler.trigger(walletOnly);

			vi.mocked(getSolSignatures).mockClear();
			vi.mocked(resolveSolSignatures).mockClear();
			postMessageMock.mockClear();
		});

		it('should load the signatures of the cut slot, which the pager holds back, on the next page of the same tick', async () => {
			const newSignatures = signaturesFrom({ slot: 112n, count: pagerLimit + 2 });
			const cutSignature = newSignatures[pagerLimit - 1];

			await mockWalletHistory([...newSignatures, held]);

			await scheduler.trigger(walletOnly);

			const [firstPage, nextPage] = headCursors();

			expect(firstPage).toBeUndefined();
			expect(nextPage?.pending.map(({ signature }) => signature)).toEqual([cutSignature.signature]);

			expect(postedSignatures()).toEqual(signaturesOf(newSignatures));
		});

		it('should load the signatures of the cut slot on the next tick when the pages of a tick run out', async () => {
			const burst = signaturesFrom({
				slot: 200n,
				count: pagerLimit * SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK + 3
			});

			await mockWalletHistory([...burst, held]);

			await scheduler.trigger(walletOnly);

			expect(getSolSignatures).toHaveBeenCalledTimes(SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK);

			const readInOneTick = pagerLimit * SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK - 1;

			expect(postedSignatures()).toEqual(signaturesOf(burst.slice(0, readInOneTick)));

			vi.mocked(getSolSignatures).mockClear();

			await scheduler.trigger(walletOnly);

			const [, resumed] = headCursors();

			expect(resumed?.pending.map(({ signature }) => signature)).toEqual([
				burst[readInOneTick].signature
			]);

			// Everything once, and nothing it held before the burst.
			expect(postedSignatures()).toEqual(signaturesOf(burst));
		});

		it('should keep paging through a crowded slot while the pager returns empty pages', async () => {
			const crowded = Array.from({ length: pagerLimit * 2 + 5 }, () => signatureAt({ slot: 105n }));

			await mockWalletHistory([...crowded, held]);

			await scheduler.trigger(walletOnly);

			const pages = await Promise.all(
				vi.mocked(getSolSignatures).mock.results.map(({ value }) => value)
			);

			expect(pages.map(({ signatures }) => signatures.length)).toEqual([0, 0, crowded.length + 1]);

			expect(new Set(postedSignatures())).toEqual(new Set(signaturesOf(crowded)));
			expect(postedSignatures()).toHaveLength(crowded.length);
		});

		it('should load a crowded slot that takes more pages than a tick has on the next ticks', async () => {
			const crowded = Array.from(
				{ length: pagerLimit * SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK + 5 },
				() => signatureAt({ slot: 105n })
			);

			await mockWalletHistory([...crowded, held]);

			await scheduler.trigger(walletOnly);

			expect(walletPosts()).toHaveLength(0);

			await scheduler.trigger(walletOnly);

			expect(new Set(postedSignatures())).toEqual(new Set(signaturesOf(crowded)));
			expect(postedSignatures()).toHaveLength(crowded.length);
		});

		// Everything above the newest slot held has been loaded once the cut reaches it, even when the
		// pager still holds that slot back.
		it('should settle once a crowded slot is the newest it holds', async () => {
			const crowded = Array.from({ length: pagerLimit * 2 + 5 }, () => signatureAt({ slot: 105n }));

			await mockWalletHistory([...crowded, held]);

			await scheduler.trigger(walletOnly);

			vi.mocked(getSolSignatures).mockClear();
			postMessageMock.mockClear();

			await scheduler.trigger(walletOnly);
			await scheduler.trigger(walletOnly);

			expect(getSolSignatures).toHaveBeenCalledTimes(2);
			expect(walletPosts()).toHaveLength(0);
			expect(scheduler['store'].catchUp).toEqual([]);
		});

		// While a walk is still paging through a crowded slot, the head answers every tick with the same
		// empty page and cut: it is the same burst, not a new one to walk again.
		it('should queue one walk for a crowded slot that the head keeps answering with the same cut', async () => {
			const crowded = Array.from(
				{ length: pagerLimit * SOLANA_HEAD_CHECK_MAX_PAGES_PER_TICK * 2 + 5 },
				() => signatureAt({ slot: 105n })
			);

			await mockWalletHistory([...crowded, held]);

			await scheduler.trigger(walletOnly);

			expect(scheduler['store'].catchUp).toHaveLength(1);

			await scheduler.trigger(walletOnly);

			expect(scheduler['store'].catchUp).toHaveLength(1);

			await scheduler.trigger(walletOnly);

			expect(scheduler['store'].catchUp).toEqual([]);

			expect(new Set(postedSignatures())).toEqual(new Set(signaturesOf(crowded)));
			expect(postedSignatures()).toHaveLength(crowded.length);
		});

		it('should resolve a signature returned by the head and a walk once, with the sources of both', async () => {
			const fromWallet = signatureAt({ slot: 105n });
			const fromTokenAccount = { ...fromWallet, sources: [mockAtaAddress] };

			const walkCursor: SolSignaturesCursor = {
				before: { [mockSolAddress]: { signature: fromWallet.signature, slot: 106n } },
				exhausted: [],
				pending: []
			};

			vi.mocked(getSolSignatures).mockImplementation(({ cursor }) =>
				Promise.resolve(
					isNullish(cursor)
						? { signatures: [fromWallet], cursor: walkCursor }
						: { signatures: [fromTokenAccount] }
				)
			);

			await scheduler.trigger(walletOnly);

			expect(resolveSolSignatures).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					signatures: [{ ...fromWallet, sources: [mockSolAddress, mockAtaAddress] }]
				})
			);
		});
	});

	describe('posting', () => {
		it('should not post when nothing changed', async () => {
			await scheduler.trigger(data);

			postMessageMock.mockClear();

			await scheduler.trigger(data);

			expect(walletPosts()).toHaveLength(0);
		});

		it('should post the balances with no transactions when only a balance changed', async () => {
			await scheduler.trigger(data);

			const balances = { ...mockBalances, spl: { ...mockBalances.spl, [mint2]: 8n } };
			vi.mocked(loadSolNetworkBalances).mockResolvedValue(balances);
			postMessageMock.mockClear();

			await scheduler.trigger(data);

			const posts = walletPosts();

			expect(posts).toHaveLength(1);
			expect(posts[0].data.wallet.balances).toEqual(balances);
			expect(postedTransactions(posts[0])).toEqual([]);
		});
	});

	describe('backend', () => {
		it("should save each token's records under its own backend token id", async () => {
			const walletSignature = signatureAt({ slot: 103n });
			const ataSignature = signatureAt({ slot: 102n, sources: [mockAtaAddress] });
			const shared = signatureAt({
				slot: 101n,
				sources: [mockSolAddress, mockAtaAddress, mockAtaAddress2]
			});
			mockPage([walletSignature, ataSignature, shared]);

			await scheduler.trigger(data);

			await vi.waitFor(() => expect(saveSolFinalizedTransactions).toHaveBeenCalledTimes(3));

			const [walletRecord, ataRecord, sharedRecord] = toResolved([
				walletSignature,
				ataSignature,
				shared
			]).map(({ transaction }) => transaction);

			expect(mapSolSourcesToTokens).toHaveBeenCalledExactlyOnceWith({
				address: mockSolAddress,
				tokens
			});
			expect(saveSolFinalizedTransactions).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokenId: { SolNativeMainnet: null },
				transactions: [walletRecord, sharedRecord]
			});
			expect(saveSolFinalizedTransactions).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokenId: { SplMainnet: mint },
				transactions: [ataRecord, sharedRecord]
			});
			expect(saveSolFinalizedTransactions).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokenId: { SplMainnet: mint2 },
				transactions: [sharedRecord]
			});
		});

		it('should not save when it found no new record', async () => {
			await scheduler.trigger(data);

			await vi.waitFor(() => expect(saveSolFinalizedTransactions).toHaveBeenCalled());

			vi.mocked(saveSolFinalizedTransactions).mockClear();

			vi.mocked(loadSolNetworkBalances).mockResolvedValue({ ...mockBalances, sol: 200n });

			await scheduler.trigger(data);

			expect(saveSolFinalizedTransactions).not.toHaveBeenCalled();
		});

		it('should still post when the backend save fails', async () => {
			vi.mocked(saveSolFinalizedTransactions).mockRejectedValue(new Error('Backend save failed'));

			await scheduler.trigger(data);

			expect(walletPosts()).toHaveLength(1);
		});
	});

	describe('errors', () => {
		it('should post syncSolWalletError for the network after retrying', async () => {
			const error = new Error('test');
			vi.mocked(loadSolNetworkBalances).mockRejectedValue(error);

			await triggerAndSettle();

			// first time + 10 retries
			expect(loadSolNetworkBalances).toHaveBeenCalledTimes(11);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: 'syncSolWalletError',
				ref: SolanaNetworks.mainnet,
				data: { error }
			});
			expect(walletPosts()).toHaveLength(0);
		});

		// The listener resets every token of the network on an error, so the next sync must post
		// everything again rather than a delta.
		it('should post everything again after a fatal error', async () => {
			await scheduler.trigger(data);

			vi.mocked(loadSolNetworkBalances).mockRejectedValue(new Error('Failed to fetch'));

			await triggerAndSettle();

			vi.mocked(loadSolNetworkBalances).mockResolvedValue(mockBalances);
			postMessageMock.mockClear();

			await scheduler.trigger(data);

			const posts = walletPosts();

			expect(posts).toHaveLength(1);
			expect(posts[0].data.wallet.balances).toEqual(mockBalances);
			expect(postedTransactions(posts[0])).toEqual(toResolved(page));
		});
	});

	describe('data changes', () => {
		it.each([
			{ change: 'another token list', changedData: { ...data, tokens: [tokens[0]] } },
			{
				change: 'another address',
				changedData: { ...data, address: { data: mockSolAddress2, certified: false } }
			},
			{ change: 'another network', changedData: { ...data, solanaNetwork: SolanaNetworks.devnet } }
		])('should start over when triggered for $change', async ({ changedData }) => {
			await scheduler.trigger(data);

			postMessageMock.mockClear();

			await scheduler.trigger(changedData);

			expect(resolveSolSignatures).toHaveBeenCalledTimes(2);

			const posts = walletPosts();

			expect(posts).toHaveLength(1);
			expect(posts[0].ref).toBe(changedData.solanaNetwork);
			expect(postedTransactions(posts[0])).toEqual(toResolved(page));
		});

		// `SchedulerTimer.start` returns early while its timer runs, so without stopping it first the
		// timer would keep syncing the token list it was started with.
		it('should sync the new token list when started again while its timer runs', async () => {
			await scheduler.start(data);

			await awaitJobExecution();

			const changedData = { ...data, tokens: [tokens[0]] };

			await scheduler.start(changedData);

			await awaitJobExecution();

			vi.mocked(getSolSignatures).mockClear();

			await vi.advanceTimersByTimeAsync(SOL_WALLET_TIMER_INTERVAL_MILLIS * 2);

			expect(getSolSignatures).toHaveBeenCalledTimes(2);

			vi.mocked(getSolSignatures).mock.calls.forEach(([params]) =>
				expect(params.tokensList).toEqual(changedData.tokens)
			);
		});
	});
});
