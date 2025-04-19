import type { UserProfile } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api');

const mockProfile: UserProfile = {
	...mockUserProfile,
	version: [1n]
};
const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('load-user-profile.services', () => {
	describe('loadUserProfile', () => {
		beforeEach(() => {
			userProfileStore.reset();
			vi.clearAllMocks();
		});

		it('should not create a user profile if uncertified profile is found', async () => {
			const getUserProfileSpy = vi
				.spyOn(backendApi, 'getUserProfile')
				.mockResolvedValue({ Ok: mockProfile });
			const createUserProfileSpy = vi.spyOn(backendApi, 'createUserProfile');

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: true });

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
				.mockResolvedValue(mockProfile);

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: true });

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

			expect(result).toEqual({ success: true });

			expect(getUserProfileSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(getUserProfileSpy).toHaveBeenCalledWith({
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

			expect(result).toEqual({ success: true });

			expect(getUserProfileSpy).not.toHaveBeenCalled();
			expect(get(userProfileStore)).toEqual({ certified: true, profile: anotherProfile });
		});

		it('should load the user profile if reload is false but the store is nullish', async () => {
			userProfileStore.reset();

			const result = await loadUserProfile({ identity: mockIdentity, reload: false });

			expect(result).toEqual({ success: true });

			expect(get(userProfileStore)).toEqual({ certified: false, profile: mockProfile });
		});

		it('should handle errors when loading the user profile', async () => {
			vi.spyOn(backendApi, 'getUserProfile').mockRejectedValue(new Error('Error'));

			const result = await loadUserProfile({ identity: mockIdentity });

			expect(result).toEqual({ success: false });
		});
	});
});
