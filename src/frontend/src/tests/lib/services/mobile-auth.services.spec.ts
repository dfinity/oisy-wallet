import { idleSignOut, signOut } from '$lib/services/auth.services';
import { endMobileRuntime } from '$lib/services/mobile-runtime.services';
import { authStore } from '$lib/stores/auth.store';
import { busy } from '$lib/stores/busy.store';
import { get } from 'svelte/store';

vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));
vi.mock('$lib/services/analytics.services', () => ({ trackEvent: vi.fn() }));
vi.mock('$lib/services/mobile-runtime.services', () => ({ endMobileRuntime: vi.fn() }));

describe('mobile logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(authStore, 'signOut').mockResolvedValue(undefined);
	});

	it('preserves the returning welcome when the auth worker ends an expired session', async () => {
		await idleSignOut();

		expect(authStore.signOut).toHaveBeenCalledOnce();
		expect(endMobileRuntime).toHaveBeenCalledExactlyOnceWith('sessionExpired');
		expect(get(busy)).toBeUndefined();
	});

	it('uses the introduction after explicit logout', async () => {
		await signOut({});

		expect(endMobileRuntime).toHaveBeenCalledExactlyOnceWith('signOut');
	});

	it('clears the busy state if native teardown rejects', async () => {
		vi.mocked(endMobileRuntime).mockRejectedValueOnce(new Error('Host closed'));

		await expect(idleSignOut()).rejects.toThrow('Host closed');
		expect(get(busy)).toBeUndefined();
	});
});
