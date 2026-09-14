import { getUserProfile } from '$lib/api/backend.api';
import { trackProfileDecodeFailed } from '$lib/services/error-analytics.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/api/backend.api', () => ({
	getUserProfile: vi.fn(),
	createUserProfile: vi.fn()
}));

vi.mock('$lib/services/error-analytics.services', () => ({
	trackProfileDecodeFailed: vi.fn()
}));

vi.mock('$lib/stores/toasts.store', () => ({
	toastsError: vi.fn()
}));

describe('load-user-profile.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		userProfileStore.reset();
	});

	describe('loadUserProfile', () => {
		// The message @dfinity/candid throws when the profile carries a variant this frontend's
		// generated bindings do not know. The user is signed out, so it must be reported.
		it('should track the field hash when the profile cannot be decoded', async () => {
			vi.mocked(getUserProfile).mockRejectedValue(new Error('Cannot find field hash _400215630_'));

			const { success } = await loadUserProfile({ identity: mockIdentity });

			expect(success).toBeFalsy();

			expect(trackProfileDecodeFailed).toHaveBeenCalledExactlyOnceWith({
				fieldHash: '400215630'
			});
		});

		it('should not track anything for a profile load failure that is not a decode error', async () => {
			vi.mocked(getUserProfile).mockRejectedValue(new Error('Some other error'));

			const { success } = await loadUserProfile({ identity: mockIdentity });

			expect(success).toBeFalsy();

			expect(trackProfileDecodeFailed).not.toHaveBeenCalled();
		});
	});
});
