import { SUPPORTED_MAINNET_NETWORKS_IDS } from '$env/networks/networks.env';
import { userNetworks, userNetworksSettings } from '$lib/derived/user-networks.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { UserNetworks } from '$lib/types/user-networks';
import {
	expectedMockUserNetworks,
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('user-networks.derived', () => {
	const certified = true;

	describe('userNetworksSettings', () => {
		it('should return undefined when user profile is not set', () => {
			userProfileStore.reset();
			expect(get(userNetworksSettings)).toBeUndefined();
		});

		it('should return user profile if it is not nullish', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });
			expect(get(userNetworksSettings)).toEqual(mockNetworksSettings);
		});
	});

	describe('userNetworks', () => {
		const expectedMainnets: UserNetworks = SUPPORTED_MAINNET_NETWORKS_IDS.reduce<UserNetworks>(
			(acc, id) => ({
				...acc,
				[id]: { enabled: true, isTestnet: false }
			}),
			{}
		);

		it('should return only mainnets when user profile is not set', () => {
			userProfileStore.reset();
			expect(get(userNetworks)).toEqual(expectedMainnets);
		});

		it('should return only mainnets when user networks are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						networks: { ...mockNetworksSettings, networks: [] }
					})
				}
			});
			expect(get(userNetworks)).toEqual(expectedMainnets);
		});

		it('should return the user networks if they are set', () => {
			userProfileStore.set({ certified, profile: mockUserProfile });
			expect(get(userNetworks)).toEqual(expectedMockUserNetworks);
		});
	});
});
