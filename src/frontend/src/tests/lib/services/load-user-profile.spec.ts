import type { UserProfile } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import {
	PLAUSIBLE_EVENT_ERROR_CODES,
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR
} from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { infrastructureError } from '$lib/stores/infrastructure-error.store';
import { toastsStore } from '$lib/stores/toasts.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { SignupsClosedError } from '$lib/types/errors';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { HttpFetchErrorCode, TransportError } from '@dfinity/agent';
import { waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api');

const mockProfile: UserProfile = {
	...mockUserProfile,
	version: [1n]
};
const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('load-user-profile.services', () => {
	let trackAppErrorSpy: MockInstance;

	describe('loadUserProfile', () => {
		beforeEach(() => {
			userProfileStore.reset();
			infrastructureError.reset();
			toastsStore.reset();
			vi.clearAllMocks();

			trackAppErrorSpy = vi.spyOn(analyticsServices, 'trackAppError').mockImplementation(() => {});
		});

		it('should not create a user profile if uncertified profile is found', async () => {
			const getUserProfileSpy = vi
				.spyOn(backendApi, 'getUserProfile')
				.mockResolvedValue({ Ok: mockProfile });
			const createUserProfileSpy = vi.spyOn(backendApi, 'createUserProfile');

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: true, profileCreated: false });

			expect(getUserProfileSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(createUserProfileSpy).not.toHaveBeenCalled();
			expect(get(userProfileStore)).toEqual({ certified: false, profile: mockProfile });
		});

		it('should create a user profile if uncertified profile is not found', async () => {
			const getUserProfileSpy = vi
				.spyOn(backendApi, 'getUserProfile')
				.mockResolvedValue({ Err: { NotFound: null } });
			const createUserProfileSpy = vi
				.spyOn(backendApi, 'createUserProfile')
				.mockResolvedValue({ Ok: mockProfile });

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: true, profileCreated: true });

			expect(getUserProfileSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(createUserProfileSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				nullishIdentityErrorMessage
			});
			expect(get(userProfileStore)).toEqual({ certified: true, profile: mockProfile });
		});

		it('should load the store with certified data when uncertified profile is found', async () => {
			const getUserProfileSpy = vi
				.spyOn(backendApi, 'getUserProfile')
				.mockResolvedValue({ Ok: mockProfile });

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: true, profileCreated: false });

			expect(getUserProfileSpy).toHaveBeenCalledTimes(2);
			expect(getUserProfileSpy).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(getUserProfileSpy).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				certified: true,
				nullishIdentityErrorMessage
			});

			await waitFor(() =>
				expect(get(userProfileStore)).toEqual({ certified: true, profile: mockProfile })
			);
		});

		it('should not load the user profile if reload is false and the store is not empty', async () => {
			const anotherProfile: UserProfile = { ...mockProfile, version: [2n] };

			userProfileStore.set({ certified: true, profile: anotherProfile });

			const getUserProfileSpy = vi.spyOn(backendApi, 'getUserProfile');

			const result = await loadUserProfile({ identity: mockIdentity, reload: false });

			expect(result).toEqual({ success: true, profileCreated: false });

			expect(getUserProfileSpy).not.toHaveBeenCalled();
			expect(get(userProfileStore)).toEqual({ certified: true, profile: anotherProfile });
		});

		it('should load the user profile if reload is false but the store is nullish', async () => {
			userProfileStore.reset();

			const result = await loadUserProfile({ identity: mockIdentity, reload: false });

			expect(result).toEqual({ success: true, profileCreated: false });

			expect(get(userProfileStore)).toEqual({ certified: false, profile: mockProfile });
		});

		it('should handle errors when loading the user profile', async () => {
			vi.spyOn(backendApi, 'getUserProfile').mockRejectedValue(new Error('Error'));

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: false, err: 'unknown', profileCreated: false });
		});

		it('should handle unknown error from getUserProfile', async () => {
			vi.spyOn(backendApi, 'getUserProfile').mockResolvedValue({
				Err: { InternalError: null } as never
			});

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: false, err: 'unknown', profileCreated: false });
		});

		it('should surface signups-closed when createUserProfile rejects with SignupsClosedError', async () => {
			vi.spyOn(backendApi, 'getUserProfile').mockResolvedValue({ Err: { NotFound: null } });
			const createUserProfileSpy = vi
				.spyOn(backendApi, 'createUserProfile')
				.mockRejectedValue(new SignupsClosedError());

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: false, err: 'signups-closed', profileCreated: false });
			expect(createUserProfileSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				nullishIdentityErrorMessage
			});
			expect(get(userProfileStore)).toBeNull();
		});

		it('should handle certified profile load failure gracefully', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			let callCount = 0;
			vi.spyOn(backendApi, 'getUserProfile').mockImplementation(({ certified }) => {
				callCount++;

				if (!certified) {
					return Promise.resolve({ Ok: mockProfile });
				}

				return Promise.reject(new Error('Certified load failed'));
			});

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: true, profileCreated: false });
			expect(get(userProfileStore)).toEqual({ certified: false, profile: mockProfile });

			await waitFor(() => expect(callCount).toBe(2));

			consoleErrorSpy.mockRestore();
		});

		describe('when the network is unreachable', () => {
			const networkError = () =>
				TransportError.fromCode(new HttpFetchErrorCode(new TypeError('Load failed')));

			beforeEach(() => {
				infrastructureError.reset();
				vi.spyOn(console, 'error').mockImplementation(() => {});
			});

			it('should surface network-unreachable instead of unknown', async () => {
				vi.spyOn(backendApi, 'getUserProfile').mockRejectedValue(networkError());

				const result = await loadUserProfile({ identity: mockIdentity });

				expect(result).toEqual({
					success: false,
					err: 'network-unreachable',
					profileCreated: false
				});
			});

			it('should record the failing operation in the infrastructure error store', async () => {
				vi.spyOn(backendApi, 'getUserProfile').mockRejectedValue(networkError());

				await loadUserProfile({ identity: mockIdentity });

				expect(get(infrastructureError)).toEqual({
					operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
					detail: expect.stringContaining('Failed to fetch HTTP request')
				});
			});

			// The page owns this failure; a toast floating over a dead skeleton is what we are fixing.
			it('should not show a toast', async () => {
				vi.spyOn(backendApi, 'getUserProfile').mockRejectedValue(networkError());

				await loadUserProfile({ identity: mockIdentity });

				expect(get(toastsStore)).toHaveLength(0);
			});

			it('should track a blocker-severity exceptional error', async () => {
				vi.spyOn(backendApi, 'getUserProfile').mockRejectedValue(networkError());

				await loadUserProfile({ identity: mockIdentity });

				expect(trackAppErrorSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
						code: PLAUSIBLE_EVENT_ERROR_CODES.NETWORK_ERROR,
						severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.BLOCKER
					})
				);
			});

			it('should clear a standing error once the profile loads again', async () => {
				infrastructureError.set({
					operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
					err: networkError()
				});
				vi.spyOn(backendApi, 'getUserProfile').mockResolvedValue({ Ok: mockProfile });

				await loadUserProfile({ identity: mockIdentity });

				expect(get(infrastructureError)).toBeUndefined();
			});

			it('should still show a toast and report unknown for a non-network error', async () => {
				vi.spyOn(backendApi, 'getUserProfile').mockRejectedValue(new Error('Boom'));

				const result = await loadUserProfile({ identity: mockIdentity });

				expect(result).toEqual({ success: false, err: 'unknown', profileCreated: false });
				expect(get(infrastructureError)).toBeUndefined();
				expect(get(toastsStore)[0].text).toContain(en.init.error.loading_profile);
			});
		});
	});
});
