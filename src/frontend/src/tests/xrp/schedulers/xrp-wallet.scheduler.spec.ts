import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import { XRP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { PostMessageDataRequestXrp } from '$lib/types/post-message';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpWalletScheduler } from '$xrp/schedulers/xrp-wallet.scheduler';
import { XrpNetworks } from '$xrp/types/network';
import { jsonReplacer, jsonReviver } from '@dfinity/utils';
import type { MockInstance } from 'vitest';

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
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

describe('xrp-wallet.scheduler', () => {
	let spyLoadBalance: MockInstance;
	let spyLoadTransactions: MockInstance;

	const mockBalance = 25_000_000n;

	const mockRawTransaction = {
		tx: {
			TransactionType: 'Payment',
			Account: 'rSender',
			Destination: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
			Amount: '5000000',
			hash: 'HASH1',
			ledger_index: 42,
			date: 1
		},
		meta: { TransactionResult: 'tesSUCCESS' },
		validated: true
	};

	const startData: PostMessageDataRequestXrp = {
		address: { data: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', certified: false },
		xrpNetwork: XrpNetworks.mainnet
	};

	const ref = `${XRP_TOKEN.symbol}-${XrpNetworks.mainnet}-${startData.address.data}`;

	const mockPostMessageStatusInProgress = {
		msg: 'syncXrpWalletStatus',
		data: { state: 'in_progress' }
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncXrpWalletStatus',
		data: { state: 'idle' }
	};

	const mockPostMessageWallet = {
		msg: 'syncXrpWallet',
		ref,
		data: {
			wallet: {
				balance: { certified: false, data: mockBalance },
				newTransactions: JSON.stringify([], jsonReplacer)
			}
		}
	};

	const postMessageMock = vi.fn();
	let originalPostMessage: unknown;

	const awaitJobExecution = () =>
		vi.advanceTimersByTimeAsync(XRP_WALLET_TIMER_INTERVAL_MILLIS - 100);

	beforeAll(() => {
		originalPostMessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockAuthStore();

		spyLoadBalance = vi.spyOn(xrplRest, 'loadXrpBalance').mockResolvedValue(mockBalance);
		spyLoadTransactions = vi
			.spyOn(xrplRest, 'loadXrpTransactions')
			.mockResolvedValue({ transactions: [] });

		const provider = AuthClientProvider.getInstance();
		vi.mocked(provider.loadIdentity).mockResolvedValue(mockIdentity);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostMessage;
	});

	it('should postMessage the balance and worker status', async () => {
		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);
		await awaitJobExecution();

		expect(postMessageMock).toHaveBeenCalledTimes(3);
		expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
		expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageWallet);
		expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageStatusIdle);

		scheduler.stop();
	});

	it('should start the scheduler with an interval', async () => {
		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);

		expect(scheduler['timer']['timer']).toBeDefined();

		scheduler.stop();
	});

	it('should trigger the balance load manually', async () => {
		const scheduler = new XrpWalletScheduler();

		await scheduler.trigger(startData);

		expect(spyLoadBalance).toHaveBeenCalledOnce();

		scheduler.stop();
	});

	it('should stop the scheduler', () => {
		const scheduler = new XrpWalletScheduler();

		scheduler.stop();

		expect(scheduler['timer']['timer']).toBeUndefined();
	});

	it('should load the balance periodically', async () => {
		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);

		expect(spyLoadBalance).toHaveBeenCalledOnce();

		await vi.advanceTimersByTimeAsync(XRP_WALLET_TIMER_INTERVAL_MILLIS);

		expect(spyLoadBalance).toHaveBeenCalledTimes(2);

		scheduler.stop();
	});

	it('should load transactions and postMessage the mapped new ones', async () => {
		spyLoadTransactions.mockResolvedValue({ transactions: [mockRawTransaction] });

		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);
		await awaitJobExecution();

		expect(spyLoadTransactions).toHaveBeenCalledOnce();

		const walletCall = postMessageMock.mock.calls.find(
			([message]) => message?.msg === 'syncXrpWallet'
		);
		const transactions = JSON.parse(walletCall?.[0].data.wallet.newTransactions, jsonReviver);

		expect(transactions).toHaveLength(1);
		expect(transactions[0].data.id).toBe('HASH1');
		expect(transactions[0].data.type).toBe('receive');
		expect(transactions[0].data.value).toBe(5_000_000n);

		scheduler.stop();
	});

	// The balance and the history come from different endpoints. Coupled through `Promise.all`, an
	// `account_tx` outage rejected the pair and the catch posted `syncXrpWalletError` — which clears
	// the balance store as well, so a balance that had just been read correctly disappeared because
	// a different endpoint was down.
	it('should post a balance that loaded even when the transactions request fails', async () => {
		spyLoadTransactions.mockRejectedValue(new Error('account_tx down'));

		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);
		await awaitJobExecution();

		const walletCall = postMessageMock.mock.calls.find(
			([message]) => message?.msg === 'syncXrpWallet'
		);

		expect(walletCall).toBeDefined();
		expect(walletCall?.[0].data.wallet.balance.data).toBe(mockBalance);

		// And carries no history at all rather than an empty page: `[]` would be written to the
		// store, marking it initialized, and the UI would report the account as having no activity
		// on the strength of a request that failed.
		expect(walletCall?.[0].data.wallet.newTransactions).toBeUndefined();

		expect(postMessageMock).not.toHaveBeenCalledWith(
			expect.objectContaining({ msg: 'syncXrpWalletError' })
		);

		scheduler.stop();
	});

	// After a tick where `account_tx` failed, a later successful EMPTY page changes neither the
	// balance nor the row count — so the "nothing changed" early return swallowed it and the UI
	// store stayed uninitialized, leaving Activity on skeletons for an account that simply has no
	// transactions. The first successful page has to get through on its own account.
	it('should post the first successful empty page after a failed history tick', async () => {
		spyLoadTransactions.mockRejectedValueOnce(new Error('account_tx down'));
		spyLoadTransactions.mockResolvedValue({ transactions: [] });

		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);
		await awaitJobExecution();

		postMessageMock.mockClear();

		await scheduler.trigger(startData);
		await awaitJobExecution();

		const walletCall = postMessageMock.mock.calls.find(
			([message]) => message?.msg === 'syncXrpWallet'
		);

		expect(walletCall).toBeDefined();
		expect(walletCall?.[0].data.wallet.newTransactions).toBe('[]');

		scheduler.stop();
	});

	// The history request sat inside the retried function, so a balance outage re-issued a
	// perfectly good `account_tx` on every attempt — eleven calls for one tick, aimed at a provider
	// that is already failing.
	it('asks for the history once even while the balance is retried', async () => {
		spyLoadBalance.mockRejectedValue(new Error('account_info down'));
		spyLoadTransactions.mockResolvedValue({ transactions: [mockRawTransaction] });

		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);
		await awaitJobExecution();

		expect(vi.mocked(spyLoadBalance).mock.calls.length).toBeGreaterThan(1);
		expect(spyLoadTransactions).toHaveBeenCalledOnce();

		scheduler.stop();
	});

	// The UI store is cleared whenever this scheduler is stopped — every caller that stops it is
	// handing ownership over. The cache has to go with it: `setRef` only clears on a CHANGED ref, so
	// a restart on the same address would diff its first page against a full cache, report nothing
	// new, and leave that cleared store empty. The account's history would just disappear.
	it('should report its rows again after a stop and a same-address restart', async () => {
		spyLoadTransactions.mockResolvedValue({ transactions: [mockRawTransaction] });

		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);
		await awaitJobExecution();

		scheduler.stop();
		postMessageMock.mockClear();

		await scheduler.start(startData);
		await awaitJobExecution();

		const walletCall = postMessageMock.mock.calls.find(
			([message]) => message?.msg === 'syncXrpWallet'
		);
		const transactions = JSON.parse(walletCall?.[0].data.wallet.newTransactions, jsonReviver);

		expect(transactions).toHaveLength(1);
		expect(transactions[0].data.id).toBe('HASH1');

		scheduler.stop();
	});

	// The restart puts back the very ref the previous job captured, so the ref alone let that job's
	// late result through. Landing while the restart awaited the identity, it filled the fresh cache
	// while the idle timer dropped its message — and the restarted job, finding nothing new, posted
	// nothing at all.
	it('should drop a job that completes after a stop and a same-address restart', async () => {
		let deliverStalePage: (page: { transactions: unknown[] }) => void = () => undefined;

		spyLoadTransactions
			.mockImplementationOnce(() => new Promise((resolve) => (deliverStalePage = resolve)))
			.mockResolvedValue({ transactions: [mockRawTransaction] });

		const scheduler = new XrpWalletScheduler();

		await scheduler.start(startData);

		scheduler.stop();

		let deliverIdentity: (identity: typeof mockIdentity) => void = () => undefined;

		vi.mocked(AuthClientProvider.getInstance().loadIdentity).mockImplementationOnce(
			() => new Promise((resolve) => (deliverIdentity = resolve))
		);

		const restart = scheduler.start(startData);

		deliverStalePage({ transactions: [mockRawTransaction] });
		await vi.advanceTimersByTimeAsync(0);

		postMessageMock.mockClear();

		deliverIdentity(mockIdentity);
		await restart;
		await awaitJobExecution();

		const walletCall = postMessageMock.mock.calls.find(
			([message]) => message?.msg === 'syncXrpWallet'
		);

		expect(walletCall?.[0].data.wallet.balance.data).toBe(mockBalance);

		const transactions = JSON.parse(walletCall?.[0].data.wallet.newTransactions, jsonReviver);

		expect(transactions).toHaveLength(1);
		expect(transactions[0].data.id).toBe('HASH1');

		scheduler.stop();
	});

	// A job snapshots the address it was scheduled with. If the scheduler is re-keyed to another
	// address while that job is in flight, its result belongs to the previous account and must not
	// be merged into or posted against the new one.
	describe('trust lines', () => {
		let spyLoadAccountLines: MockInstance;

		const walletCalls = () =>
			postMessageMock.mock.calls
				.map(([message]) => message)
				.filter((message) => message?.msg === 'syncXrpWallet');

		beforeEach(() => {
			spyLoadAccountLines = vi
				.spyOn(xrplRest, 'loadXrpAccountLines')
				.mockResolvedValue([mockXrpTrustLine]);
		});

		it('does not read them while trust-line tokens are off', async () => {
			const scheduler = new XrpWalletScheduler();

			await scheduler.start(startData);
			await awaitJobExecution();

			expect(spyLoadAccountLines).not.toHaveBeenCalled();
			expect(walletCalls()[0]?.data.wallet.trustLines).toBeUndefined();

			scheduler.stop();
		});

		describe('when trust-line tokens are on', () => {
			beforeEach(() => {
				vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(true);
			});

			it('posts the lines with the balance on the first read', async () => {
				const scheduler = new XrpWalletScheduler();

				await scheduler.start(startData);
				await awaitJobExecution();

				expect(spyLoadAccountLines).toHaveBeenCalledExactlyOnceWith({
					address: startData.address.data,
					network: XrpNetworks.mainnet
				});
				expect(walletCalls()[0]?.data.wallet).toEqual(
					expect.objectContaining({
						balance: { certified: false, data: mockBalance },
						trustLines: [mockXrpTrustLine]
					})
				);

				scheduler.stop();
			});

			// An account without lines is an answer: the listener has to learn it, or a removed last
			// line would keep its token on screen.
			it('posts an empty list on the first read', async () => {
				spyLoadAccountLines.mockResolvedValue([]);

				const scheduler = new XrpWalletScheduler();

				await scheduler.start(startData);
				await awaitJobExecution();

				expect(walletCalls()[0]?.data.wallet.trustLines).toEqual([]);

				scheduler.stop();
			});

			it('posts nothing when neither the balance nor the lines changed', async () => {
				const scheduler = new XrpWalletScheduler();

				await scheduler.start(startData);
				await awaitJobExecution();

				postMessageMock.mockClear();

				await scheduler.trigger(startData);
				await awaitJobExecution();

				expect(walletCalls()).toHaveLength(0);

				scheduler.stop();
			});

			it('posts the lines again once they change', async () => {
				const scheduler = new XrpWalletScheduler();

				await scheduler.start(startData);
				await awaitJobExecution();

				postMessageMock.mockClear();

				const changed = { ...mockXrpTrustLine, balance: '20' };
				spyLoadAccountLines.mockResolvedValue([changed]);

				await scheduler.trigger(startData);
				await awaitJobExecution();

				expect(walletCalls()[0]?.data.wallet.trustLines).toEqual([changed]);

				scheduler.stop();
			});

			// A different endpoint from the balance, so its outage must leave the balance alone and
			// must not be reported as "no lines".
			it('posts the balance without lines when the lines cannot be read', async () => {
				spyLoadAccountLines.mockRejectedValue(new Error('account_lines down'));

				const scheduler = new XrpWalletScheduler();

				await scheduler.start(startData);
				await awaitJobExecution();

				const [walletCall] = walletCalls();

				expect(walletCall?.data.wallet.balance.data).toBe(mockBalance);
				expect(walletCall?.data.wallet.trustLines).toBeUndefined();
				expect(postMessageMock).not.toHaveBeenCalledWith(
					expect.objectContaining({ msg: 'syncXrpWalletError' })
				);

				scheduler.stop();
			});

			it('reads the lines once even while the balance is retried', async () => {
				spyLoadBalance.mockRejectedValue(new Error('account_info down'));

				const scheduler = new XrpWalletScheduler();

				await scheduler.start(startData);
				await awaitJobExecution();

				expect(vi.mocked(spyLoadBalance).mock.calls.length).toBeGreaterThan(1);
				expect(spyLoadAccountLines).toHaveBeenCalledOnce();

				scheduler.stop();
			});

			// Stopping hands the account over, and the listener clears what it showed, so a restart on
			// the same address has to report the lines again or they would never reappear.
			it('posts the lines again after a stop and a same-address restart', async () => {
				const scheduler = new XrpWalletScheduler();

				await scheduler.start(startData);
				await awaitJobExecution();

				scheduler.stop();
				postMessageMock.mockClear();

				await scheduler.start(startData);
				await awaitJobExecution();

				expect(walletCalls()[0]?.data.wallet.trustLines).toEqual([mockXrpTrustLine]);

				scheduler.stop();
			});
		});
	});

	describe('when the address changes mid-flight', () => {
		const otherData: PostMessageDataRequestXrp = {
			address: { data: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe', certified: false },
			xrpNetwork: XrpNetworks.mainnet
		};

		const postsOf = (msg: string) =>
			postMessageMock.mock.calls.map(([message]) => message).filter((m) => m.msg === msg);

		// `setRef` is protected, and a subclass is the language's own way to reach it — no cast, and
		// the signature stays checked.
		class RekeyableXrpWalletScheduler extends XrpWalletScheduler {
			rekey(data: PostMessageDataRequestXrp) {
				this.setRef(data);
			}
		}

		const rekey = (scheduler: RekeyableXrpWalletScheduler) => scheduler.rekey(otherData);

		it('should discard a balance that resolves after the re-key', async () => {
			let resolveBalance: ((balance: bigint) => void) | undefined;
			spyLoadBalance.mockImplementation(
				() =>
					new Promise<bigint>((resolve) => {
						resolveBalance = resolve;
					})
			);

			const scheduler = new RekeyableXrpWalletScheduler();
			const promise = scheduler.trigger(startData);

			// `trigger` awaits the identity before running the job, so let it reach `loadXrpBalance`
			// first — otherwise the re-key happens before the request is even in flight.
			await vi.advanceTimersByTimeAsync(100);

			expect(spyLoadBalance).toHaveBeenCalled();

			rekey(scheduler);
			resolveBalance?.(mockBalance);

			await vi.runAllTimersAsync();
			await promise;

			expect(postsOf('syncXrpWallet')).toHaveLength(0);

			scheduler.stop();
		});

		it('should not report an error for an address the scheduler moved on from', async () => {
			spyLoadBalance.mockRejectedValue(new Error('test'));

			const scheduler = new RekeyableXrpWalletScheduler();
			const promise = scheduler.trigger(startData);

			rekey(scheduler);

			await vi.runAllTimersAsync();
			await promise;

			expect(postsOf('syncXrpWalletError')).toHaveLength(0);

			scheduler.stop();
		});

		it('should still post a balance that resolves before any re-key', async () => {
			const scheduler = new XrpWalletScheduler();

			await scheduler.trigger(startData);

			expect(postsOf('syncXrpWallet')).toHaveLength(1);

			scheduler.stop();
		});
	});

	describe('on a failing balance load', () => {
		const walletPosts = () =>
			postMessageMock.mock.calls
				.map(([message]) => message)
				.filter(({ msg }) => msg === 'syncXrpWallet');

		const triggerAndSettle = async (scheduler: XrpWalletScheduler) => {
			const promise = scheduler.trigger(startData);

			await vi.runAllTimersAsync();

			await promise;
		};

		it('should postMessage syncXrpWalletError after exhausting the retries', async () => {
			const error = new Error('test');
			spyLoadBalance.mockRejectedValue(error);

			const scheduler = new XrpWalletScheduler();

			await triggerAndSettle(scheduler);

			// first attempt + 10 retries
			expect(spyLoadBalance).toHaveBeenCalledTimes(11);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: 'syncXrpWalletError',
				ref,
				data: { error }
			});
			expect(walletPosts()).toHaveLength(0);

			scheduler.stop();
		});

		// `syncWalletData` short-circuits on an unchanged balance, so the failure branch clears the
		// store. Without that reset the recovered sync would emit nothing and the UI would stay empty.
		it('should postMessage the same balance again after a fatal error', async () => {
			const scheduler = new XrpWalletScheduler();

			await scheduler.trigger(startData);

			expect(walletPosts()).toHaveLength(1);

			spyLoadBalance.mockRejectedValue(new Error('Failed to fetch'));

			await triggerAndSettle(scheduler);

			spyLoadBalance.mockResolvedValue(mockBalance);
			postMessageMock.mockClear();

			await scheduler.trigger(startData);

			const posts = walletPosts();

			expect(posts).toHaveLength(1);
			expect(posts[0].data.wallet.balance).toEqual({ certified: false, data: mockBalance });

			scheduler.stop();
		});
	});
});
