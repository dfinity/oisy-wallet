import type { UserProfile } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { userProfileStore } from '$lib/stores/settings.store';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { beforeEach } from 'node:test';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api');

const mockProfile: UserProfile = {
	credentials: [],
	version: [1n],
	created_timestamp: 1234n,
	updated_timestamp: 1234n
};

const mockPrincipalText = 'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe';

const mockPrincipal = Principal.fromText(mockPrincipalText);

const mockIdentity = {
	getPrincipal: () => mockPrincipal
} as unknown as Identity;

describe('loadUserProfile', () => {
	beforeEach(() => {
		userProfileStore.reset({ key: 'user-profile' });
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
		expect(get(userProfileStore)).toEqual(mockProfile);
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
		expect(get(userProfileStore)).toEqual(mockProfile);
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
	});
});
