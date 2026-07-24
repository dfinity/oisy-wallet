import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { XRP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { PostMessageDataRequestXrp } from '$lib/types/post-message';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as xrplApi from '$xrp/api/xrpl.api';
import { XrpWalletScheduler } from '$xrp/schedulers/xrp-wallet.scheduler';
import { XrpNetworks } from '$xrp/types/network';
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

	const mockBalance = 25_000_000n;

	const startData: PostMessageDataRequestXrp = {
		address: { data: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD', certified: false },
		xrpNetwork: XrpNetworks.mainnet
	};

	const ref = `${XRP_TOKEN.symbol}-${XrpNetworks.mainnet}`;

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
				balance: { certified: false, data: mockBalance }
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

		spyLoadBalance = vi.spyOn(xrplApi, 'loadXrpBalance').mockResolvedValue(mockBalance);

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
});
