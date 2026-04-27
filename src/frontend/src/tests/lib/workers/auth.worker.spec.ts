import { AUTH_TIMER_INTERVAL } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { onAuthMessage } from '$lib/workers/auth.worker';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';
import { KEY_STORAGE_DELEGATION } from '@icp-sdk/auth/client';
import type * as IcpSdkIdentity from '@icp-sdk/core/identity';
import { DelegationChain, isDelegationValid } from '@icp-sdk/core/identity';

vi.mock('@icp-sdk/core/identity', async () => {
	const actual = await vi.importActual<typeof IcpSdkIdentity>('@icp-sdk/core/identity');
	return {
		...actual,
		isDelegationValid: vi.fn(actual.isDelegationValid),
		DelegationChain: {
			...actual.DelegationChain,
			fromJSON: vi.fn(actual.DelegationChain.fromJSON)
		}
	};
});

vi.mock('$lib/providers/auth-client.providers', async (importActual) => {
	const storage = {
		get: vi.fn(),
		set: vi.fn(),
		remove: vi.fn()
	};
	const authClientProvider = vi.fn().mockReturnValue({
		storage,
		createAuthClient: vi.fn(),
		safeCreateAuthClient: vi.fn(),
		createAuthClientForSignIn: vi.fn(),
		loadIdentity: vi.fn()
	});

	return {
		...(await importActual()),
		AuthClientProvider: Object.assign(authClientProvider, {
			getInstance: authClientProvider
		})
	};
});

describe('auth.worker', () => {
	const createEvent = (msg: string) =>
		createMockEvent(msg) as unknown as MessageEvent<PostMessage<PostMessageDataRequest>>;

	const MOCK_DELEGATION_JSON = 'mock-delegation-chain-json';
	const MOCK_EXPIRATION_NS = 2_000_000_000_000_000_000n;

	const mockDelegationChain = {
		delegations: [
			{
				delegation: {
					pubkey: new Uint8Array([1, 2, 3]),
					expiration: MOCK_EXPIRATION_NS
				}
			}
		]
	} as unknown as DelegationChain;

	let originalPostMessage: typeof globalThis.postMessage;
	const postMessageMock = vi.fn();

	beforeAll(() => {
		originalPostMessage = globalThis.postMessage;
		globalThis.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		const provider = AuthClientProvider.getInstance();
		vi.mocked(provider.storage.get).mockResolvedValue(MOCK_DELEGATION_JSON);
		vi.mocked(DelegationChain.fromJSON).mockReturnValue(mockDelegationChain);
		vi.mocked(isDelegationValid).mockReturnValue(true);
	});

	afterEach(() => {
		// Ensure the module-level timer is cleared so tests don't leak into each other.
		onAuthMessage(createEvent('stopIdleTimer'));
		vi.useRealTimers();
	});

	afterAll(() => {
		globalThis.postMessage = originalPostMessage;
	});

	describe('onAuthMessage', () => {
		it.each(excludeValidMessageEvents(['startIdleTimer', 'stopIdleTimer']))(
			'should be a no-op for unrelated message "%s"',
			async (msg) => {
				await onAuthMessage(createEvent(msg));
				await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL * 2);

				expect(postMessageMock).not.toHaveBeenCalled();
				expect(AuthClientProvider.getInstance().storage.get).not.toHaveBeenCalled();
			}
		);
	});

	describe('startIdleTimer', () => {
		it('should read the delegation from IndexedDB, not from `localStorage`', async () => {
			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			expect(AuthClientProvider.getInstance().storage.get).toHaveBeenCalledWith(
				KEY_STORAGE_DELEGATION
			);
		});

		it('should not instantiate an `AuthClient` to check authentication', async () => {
			// `AuthClient.isAuthenticated()` is unsafe in workers (reads `localStorage`).
			// The worker must rely solely on IDB via `AuthClientProvider.storage`.
			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			expect(AuthClientProvider.getInstance().createAuthClient).not.toHaveBeenCalled();
			expect(AuthClientProvider.getInstance().loadIdentity).not.toHaveBeenCalled();
		});

		it('should emit `delegationRemainingTime` when the delegation is valid', async () => {
			const now = 1_700_000_000_000;
			vi.setSystemTime(now);

			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			// `Date.now()` at the moment the worker computes the remaining time has
			// advanced by `AUTH_TIMER_INTERVAL` (the fake timer tick that triggered
			// the check), so we subtract it from the delegation expiration in ms.
			const expected = Number(MOCK_EXPIRATION_NS / 1_000_000n) - (now + AUTH_TIMER_INTERVAL);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: 'delegationRemainingTime',
				data: { authRemainingTime: expected }
			});
			expect(postMessageMock).not.toHaveBeenCalledWith({ msg: 'signOutIdleTimer' });
		});

		it('should re-schedule the check at `AUTH_TIMER_INTERVAL`', async () => {
			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL * 3);

			expect(AuthClientProvider.getInstance().storage.get).toHaveBeenCalledTimes(3);
		});

		it('should be idempotent — calling it twice does not create two concurrent loops', async () => {
			await onAuthMessage(createEvent('startIdleTimer'));
			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			expect(AuthClientProvider.getInstance().storage.get).toHaveBeenCalledOnce();
		});

		it('should emit `signOutIdleTimer` when no delegation is stored', async () => {
			vi.mocked(AuthClientProvider.getInstance().storage.get).mockResolvedValue(null);

			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			expect(postMessageMock).toHaveBeenCalledWith({ msg: 'signOutIdleTimer' });
		});

		it('should emit `signOutIdleTimer` when the delegation is expired/invalid', async () => {
			vi.mocked(isDelegationValid).mockReturnValue(false);

			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			expect(postMessageMock).toHaveBeenCalledWith({ msg: 'signOutIdleTimer' });
			expect(postMessageMock).not.toHaveBeenCalledWith(
				expect.objectContaining({ msg: 'delegationRemainingTime' })
			);
		});

		it('should stop the loop after emitting `signOutIdleTimer`', async () => {
			vi.mocked(AuthClientProvider.getInstance().storage.get).mockResolvedValue(null);

			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL * 3);

			const signOutCalls = postMessageMock.mock.calls.filter(
				([payload]) => payload?.msg === 'signOutIdleTimer'
			);

			expect(signOutCalls).toHaveLength(1);
		});

		it('should not emit anything when the delegation has no first delegation entry', async () => {
			vi.mocked(DelegationChain.fromJSON).mockReturnValue({
				delegations: []
			});

			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			expect(postMessageMock).not.toHaveBeenCalled();
		});
	});

	describe('stopIdleTimer', () => {
		it('should stop the scheduled check', async () => {
			await onAuthMessage(createEvent('startIdleTimer'));
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

			await onAuthMessage(createEvent('stopIdleTimer'));

			const callsBefore = vi.mocked(AuthClientProvider.getInstance().storage.get).mock.calls.length;
			await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL * 3);
			const callsAfter = vi.mocked(AuthClientProvider.getInstance().storage.get).mock.calls.length;

			expect(callsAfter).toBe(callsBefore);
		});

		it('should be a no-op if no timer is running', async () => {
			await onAuthMessage(createEvent('stopIdleTimer'));

			expect(postMessageMock).not.toHaveBeenCalled();
		});
	});
});
