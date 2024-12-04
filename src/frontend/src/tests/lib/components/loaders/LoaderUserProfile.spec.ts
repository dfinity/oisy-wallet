import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
import * as authStore from '$lib/derived/auth.derived';
import * as loadUserServices from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { emit } from '$lib/utils/events.utils';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('LoaderUserProfile', () => {
	const mockAuthStore = (value = false) =>
		vi.spyOn(authStore, 'authNotSignedIn', 'get').mockImplementation(() => readable(value));

	beforeEach(() => {
		vi.restoreAllMocks();

		vi.clearAllMocks();
		vi.resetAllMocks();

		mockAuthStore();

		userProfileStore.reset();
	});

	it('should load user profile on mount', () => {
		const spy = vi.spyOn(loadUserServices, 'loadUserProfile').mockImplementationOnce(async () => {
			userProfileStore.set({ certified: true, profile: mockUserProfile });
			await Promise.resolve();
		});

		render(LoaderUserProfile);

		expect(spy).toHaveBeenCalledOnce();

		expect(get(userProfileStore)).toEqual({ certified: true, profile: mockUserProfile });
	});

	it('should re-load user profile on event', () => {
		const spy = vi.spyOn(loadUserServices, 'loadUserProfile');

		render(LoaderUserProfile);

		expect(spy).toHaveBeenCalledOnce();

		userProfileStore.set({ certified: true, profile: mockUserProfile });

		spy.mockImplementationOnce(async () => {
			userProfileStore.set({ certified: true, profile: { ...mockUserProfile, version: [2n] } });
			await Promise.resolve();
		});

		emit({ message: 'oisyRefreshUserProfile' });

		expect(spy).toHaveBeenCalledTimes(2);

		expect(get(userProfileStore)).toEqual({
			certified: true,
			profile: { ...mockUserProfile, version: [2n] }
		});
	});

	it('should not load user profile if not signed in', () => {
		mockAuthStore(true);

		const spy = vi.spyOn(loadUserServices, 'loadUserProfile');

		render(LoaderUserProfile);

		expect(spy).not.toHaveBeenCalled();
	});

	it('should reset the user profile if not signed in', () => {
		mockAuthStore(true);

		userProfileStore.set({ certified: true, profile: mockUserProfile });

		const spy = vi.spyOn(loadUserServices, 'loadUserProfile');

		render(LoaderUserProfile);

		expect(spy).not.toHaveBeenCalled();

		expect(get(userProfileStore)).toBeNull();
	});
});
