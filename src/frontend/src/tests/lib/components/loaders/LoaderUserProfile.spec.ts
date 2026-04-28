import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
import * as authServices from '$lib/services/auth.services';
import * as loadUserServices from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { emit } from '$lib/utils/events.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LoaderUserProfile', () => {
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
		const spy = vi.spyOn(loadUserServices, 'loadUserProfile').mockImplementationOnce(async () => {
			await Promise.resolve();
			return { success: true };
		});

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

	describe('when signups are closed', () => {
		it('should sign the user out via infoSignOut', async () => {
			const loadSpy = vi
				.spyOn(loadUserServices, 'loadUserProfile')
				.mockResolvedValue({ success: false, err: 'signups-closed' });

			const infoSignOutSpy = vi
				.spyOn(authServices, 'infoSignOut')
				.mockResolvedValue(undefined);

			render(LoaderUserProfile, { children: mockSnippet });

			expect(loadSpy).toHaveBeenCalledOnce();

			await waitFor(() => {
				expect(infoSignOutSpy).toHaveBeenCalledExactlyOnceWith({
					text: expect.stringMatching(/sign-?ups/i),
					source: 'signups-closed'
				});
			});

			expect(get(userProfileStore)).toBeNull();
		});

		it('should not sign the user out when loadUserProfile fails for an unknown reason', async () => {
			vi.spyOn(loadUserServices, 'loadUserProfile').mockResolvedValue({
				success: false,
				err: 'unknown'
			});

			const infoSignOutSpy = vi
				.spyOn(authServices, 'infoSignOut')
				.mockResolvedValue(undefined);

			render(LoaderUserProfile, { children: mockSnippet });

			await Promise.resolve();

			expect(infoSignOutSpy).not.toHaveBeenCalled();
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
