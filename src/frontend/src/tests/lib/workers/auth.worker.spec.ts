import { AUTH_TIMER_INTERVAL } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { onAuthMessage } from '$lib/workers/auth.worker';
import { DelegationChain, Ed25519KeyIdentity } from '@icp-sdk/core/identity';

const event = (msg: 'startIdleTimer' | 'stopIdleTimer') =>
	new MessageEvent('message', { data: { msg } });

describe('shared auth worker', () => {
	const provider = AuthClientProvider.getInstance();
	const post = vi.fn();
	let chain: DelegationChain;

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.stubGlobal('postMessage', post);
		post.mockClear();
		const root = Ed25519KeyIdentity.generate();
		const child = Ed25519KeyIdentity.generate();
		chain = await DelegationChain.create(
			root,
			child.getPublicKey(),
			new Date(Date.now() + 120_000)
		);
		vi.spyOn(provider, 'loadDelegation').mockResolvedValue(chain);
	});

	afterEach(async () => {
		await onAuthMessage(event('stopIdleTimer'));
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('checks the shared provider without constructing an AuthClient', async () => {
		const create = vi.spyOn(provider, 'createAuthClient');
		await onAuthMessage(event('startIdleTimer'));
		await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

		expect(provider.loadDelegation).toHaveBeenCalledOnce();
		expect(create).not.toHaveBeenCalled();
		expect(post).toHaveBeenCalledWith({
			msg: 'delegationRemainingTime',
			data: { authRemainingTime: 120_000 - AUTH_TIMER_INTERVAL }
		});
	});

	it('uses the earliest delegation expiry, including the mobile worker child', async () => {
		const child = Ed25519KeyIdentity.generate();
		const shorter = await DelegationChain.create(
			child,
			Ed25519KeyIdentity.generate().getPublicKey(),
			new Date(Date.now() + 60_000),
			{ previous: chain }
		);
		vi.mocked(provider.loadDelegation).mockResolvedValue(shorter);
		await onAuthMessage(event('startIdleTimer'));
		await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

		expect(post).toHaveBeenCalledWith({
			msg: 'delegationRemainingTime',
			data: { authRemainingTime: 60_000 - AUTH_TIMER_INTERVAL }
		});
	});

	it('signs out once when the delegation is absent', async () => {
		vi.mocked(provider.loadDelegation).mockResolvedValue(undefined);
		await onAuthMessage(event('startIdleTimer'));
		await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL * 3);

		expect(post).toHaveBeenCalledExactlyOnceWith({ msg: 'signOutIdleTimer' });
	});

	it('signs out when any delegation expires', async () => {
		vi.setSystemTime(Date.now() + 120_000);
		await onAuthMessage(event('startIdleTimer'));
		await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL);

		expect(post).toHaveBeenCalledExactlyOnceWith({ msg: 'signOutIdleTimer' });
	});

	it('does not duplicate timers and stops polling when destroyed', async () => {
		await onAuthMessage(event('startIdleTimer'));
		await onAuthMessage(event('startIdleTimer'));
		await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL * 3);

		expect(provider.loadDelegation).toHaveBeenCalledTimes(3);

		await onAuthMessage(event('stopIdleTimer'));
		await vi.advanceTimersByTimeAsync(AUTH_TIMER_INTERVAL * 3);

		expect(provider.loadDelegation).toHaveBeenCalledTimes(3);
	});
});
