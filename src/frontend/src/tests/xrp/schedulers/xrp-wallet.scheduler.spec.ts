import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { XRP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { PostMessageDataRequestXrp } from '$lib/types/post-message';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
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

	// A job snapshots the address it was scheduled with. If the scheduler is re-keyed to another
	// address while that job is in flight, its result belongs to the previous account and must not
	// be merged into or posted against the new one.
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
