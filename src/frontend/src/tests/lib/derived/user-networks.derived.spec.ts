import * as networksEnv from '$env/networks/networks.env';
import {
	SUPPORTED_MAINNET_NETWORKS_IDS,
	SUPPORTED_TESTNET_NETWORKS_IDS
} from '$env/networks/networks.env';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { UserNetworks } from '$lib/types/user-networks';
import { mockUserNetworks } from '$tests/mocks/user-networks.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('user-networks.derived', () => {
	const certified = true;

	describe('userNetworks', () => {
		const expectedMainnets: UserNetworks = SUPPORTED_MAINNET_NETWORKS_IDS.reduce<UserNetworks>(
			(acc, id) => ({
				...acc,
				[id]: { enabled: true, isTestnet: false }
			}),
			{}
		);

		const expectedTestnets: UserNetworks = SUPPORTED_TESTNET_NETWORKS_IDS.reduce<UserNetworks>(
			(acc, id) => ({
				...acc,
				[id]: { enabled: true, isTestnet: true }
			}),
			{}
		);

		beforeEach(() => {
			vi.resetAllMocks();

			vi.spyOn(networksEnv, 'USER_NETWORKS_FEATURE_ENABLED', 'get').mockImplementation(() => true);
		});

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
			expect(get(userNetworks)).toEqual(mockUserNetworks);
		});

		it('should return all networks when user networks are nullish but testnets are enabled', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						networks: { ...mockNetworksSettings, networks: [], testnets: { show_testnets: true } }
					})
				}
			});
			expect(get(userNetworks)).toEqual({ ...expectedMainnets, ...expectedTestnets });
		});

		it('should return the default when user networks feature is disabled', () => {
			vi.spyOn(networksEnv, 'USER_NETWORKS_FEATURE_ENABLED', 'get').mockImplementationOnce(
				() => false
			);

			userProfileStore.set({ certified, profile: mockUserProfile });
			expect(get(userNetworks)).toEqual(expectedMainnets);
		});
	});
});
