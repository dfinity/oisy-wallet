import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';

describe('DappsCarousel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();

		userProfileStore.set({ profile: mockUserProfile, certified: false });
	});
});
