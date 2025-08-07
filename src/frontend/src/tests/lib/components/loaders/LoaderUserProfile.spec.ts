import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
import * as loadUserServices from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { emit } from '$lib/utils/events.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LoaderUserProfile', () => {
	const mockSnippet = createMockSnippet('Mock Snippet');

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
			return { success: true };
		});

		render(LoaderUserProfile, { children: mockSnippet });

		expect(spy).toHaveBeenCalledOnce();

		expect(get(userProfileStore)).toEqual({ certified: true, profile: mockUserProfile });
	});

	it('should re-load user profile on event', () => {
		const spy = vi.spyOn(loadUserServices, 'loadUserProfile').mockImplementationOnce(vi.fn());

		render(LoaderUserProfile, { children: mockSnippet });

		expect(spy).toHaveBeenCalledOnce();

		userProfileStore.set({ certified: true, profile: mockUserProfile });

		spy.mockImplementationOnce(async () => {
			userProfileStore.set({ certified: true, profile: { ...mockUserProfile, version: [2n] } });
			await Promise.resolve();
			return { success: true };
		});

		emit({ message: 'oisyRefreshUserProfile' });

		expect(spy).toHaveBeenCalledTimes(2);

		expect(get(userProfileStore)).toEqual({
			certified: true,
			profile: { ...mockUserProfile, version: [2n] }
		});
	});

	describe('when identity is nullish', () => {
		beforeEach(() => {
			mockAuthStore(null);
		});

		it('should not load user profile', () => {
			const spy = vi.spyOn(loadUserServices, 'loadUserProfile');

			render(LoaderUserProfile, { children: mockSnippet });

			expect(spy).not.toHaveBeenCalled();
		});

		it('should reset the user profile', () => {
			userProfileStore.set({ certified: true, profile: mockUserProfile });

			const spy = vi.spyOn(loadUserServices, 'loadUserProfile');

			render(LoaderUserProfile, { children: mockSnippet });

			expect(spy).not.toHaveBeenCalled();

			expect(get(userProfileStore)).toBeNull();
		});
	});
});
