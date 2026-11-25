import LockOrSignOut from '$lib/components/core/LockOrSignOut.svelte';
import { LOCK_BUTTON } from '$lib/constants/test-ids.constants';
import { lockSession } from '$lib/services/auth.services';
import { authLocked } from '$lib/stores/locked.store';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/services/auth.services', () => ({
	lockSession: vi.fn(),
	signOut: vi.fn()
}));

describe('LockOrSignOut', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(authLocked, 'lock');
	});

	afterEach(() => {
		authLocked.set({ key: 'authLocked', value: false });
	});

	const clickLock = async () => {
		const { container } = render(LockOrSignOut);

		const lockButton = container.querySelector<HTMLButtonElement>(
			`button[data-tid="${LOCK_BUTTON}"]`
		);

		assertNonNullish(lockButton);

		await fireEvent.click(lockButton);
	};

	it('should lock the wallet and sign out without resetting the url', async () => {
		await clickLock();

		expect(authLocked.lock).toHaveBeenCalledExactlyOnceWith({ source: 'menu lock button' });
		expect(lockSession).toHaveBeenCalledExactlyOnceWith({ resetUrl: false });
	});

	// Another tab that finds the delegation gone must find the lock too, or it clears the cache.
	it('should store the lock before signing out', async () => {
		await clickLock();

		const [lockOrder] = vi.mocked(authLocked.lock).mock.invocationCallOrder;
		const [lockSessionOrder] = vi.mocked(lockSession).mock.invocationCallOrder;

		expect(lockOrder).toBeLessThan(lockSessionOrder);
	});
});
