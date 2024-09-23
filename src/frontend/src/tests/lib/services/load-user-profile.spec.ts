import type { UserProfile } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { waitFor } from '@testing-library/svelte';
import { beforeEach } from 'node:test';
import { get } from 'svelte/store';
import { mockIdentity } from '../../mocks/identity.mock';

vi.mock('$lib/api/backend.api');

const mockProfile: UserProfile = {
	credentials: [],
	version: [1n],
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};

describe('loadUserProfile', () => {
	beforeEach(() => {
		userProfileStore.reset();
		vi.clearAllMocks();
	});

	it("doesn't create a user profile if uncertified profile is found", async () => {
		const getUserProfileSpy = vi
			.spyOn(backendApi, 'getUserProfile')
			.mockResolvedValue({ Ok: mockProfile });
		const createUserProfileSpy = vi.spyOn(backendApi, 'createUserProfile');

		await loadUserProfile({ identity: mockIdentity });

		expect(getUserProfileSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			certified: false
		});
		expect(createUserProfileSpy).not.toHaveBeenCalled();
		expect(get(userProfileStore)).toEqual({ certified: false, profile: mockProfile });
	});

	it('creates a user profile if uncertified profile is not found', async () => {
		const getUserProfileSpy = vi
			.spyOn(backendApi, 'getUserProfile')
			.mockResolvedValue({ Err: { NotFound: null } });
		const createUserProfileSpy = vi
			.spyOn(backendApi, 'createUserProfile')
			.mockResolvedValue(mockProfile);

		await loadUserProfile({ identity: mockIdentity });

		expect(getUserProfileSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			certified: false
		});
		expect(createUserProfileSpy).toHaveBeenCalledWith({
			identity: mockIdentity
		});
		expect(get(userProfileStore)).toEqual({ certified: true, profile: mockProfile });
	});

	it('loads the store with certified data when uncertified profile is found', async () => {
		const getUserProfileSpy = vi
			.spyOn(backendApi, 'getUserProfile')
			.mockResolvedValue({ Ok: mockProfile });

		await loadUserProfile({ identity: mockIdentity });

		expect(getUserProfileSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			certified: false
		});
		expect(getUserProfileSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			certified: true
		});
		await waitFor(() =>
			expect(get(userProfileStore)).toEqual({ certified: true, profile: mockProfile })
		);
	});
});
