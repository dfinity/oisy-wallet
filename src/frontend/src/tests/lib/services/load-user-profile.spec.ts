import type { UserProfile } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { waitFor } from '@testing-library/svelte';
import { beforeEach } from 'node:test';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api');

const mockProfile: UserProfile = {
	...mockUserProfile,
	version: [1n]
};
const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

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

		await loadUserProfile({ identity: mockIdentity });

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

		await loadUserProfile({ identity: mockIdentity });

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

		await loadUserProfile({ identity: mockIdentity });

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

		await loadUserProfile({ identity: mockIdentity, reload: false });

		expect(getUserProfileSpy).not.toHaveBeenCalled();
		expect(get(userProfileStore)).toEqual({ certified: true, profile: anotherProfile });
	});

	it('should load the user profile if reload is false but the store is nullish', async () => {
		userProfileStore.reset();

		await loadUserProfile({ identity: mockIdentity, reload: false });

		expect(get(userProfileStore)).toEqual({ certified: false, profile: mockProfile });
	});
});
