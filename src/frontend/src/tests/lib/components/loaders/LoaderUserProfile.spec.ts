import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
import * as authStore from '$lib/derived/auth.derived';
import * as loadUserServices from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import type { Identity } from '@dfinity/agent';
import { render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('LoaderUserProfile', () => {
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

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

	describe('when identity is nullish', () => {
		beforeEach(() => {
			mockAuthStore(null);
		});

		it('should not load user profile', () => {
			const spy = vi.spyOn(loadUserServices, 'loadUserProfile');

			render(LoaderUserProfile);

			expect(spy).not.toHaveBeenCalled();
		});

		it('should reset the user profile', () => {
			userProfileStore.set({ certified: true, profile: mockUserProfile });

			const spy = vi.spyOn(loadUserServices, 'loadUserProfile');

			render(LoaderUserProfile);

			expect(spy).not.toHaveBeenCalled();

			expect(get(userProfileStore)).toBeNull();
		});
	});
});
