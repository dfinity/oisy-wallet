import type { NetworkSettingsFor } from '$declarations/backend/backend.did';
import {
	SUPPORTED_MAINNET_NETWORKS_IDS,
	SUPPORTED_TESTNET_NETWORK_IDS
} from '$env/networks/networks.env';
import { ICP_NETWORK_ID, ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { trackUnmappedNetworkSettingsKey } from '$lib/services/error-analytics.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { UserNetworks } from '$lib/types/user-networks';
import {
	mockUserNetworks,
	mockUserNetworksOnlyMainnetsComplete
} from '$tests/mocks/user-networks.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

vi.mock('$lib/services/error-analytics.services', () => ({
	trackUnmappedNetworkSettingsKey: vi.fn()
}));

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

		const expectedTestnets: UserNetworks = SUPPORTED_TESTNET_NETWORK_IDS.reduce<UserNetworks>(
			(acc, id) => ({
				...acc,
				[id]: { enabled: true, isTestnet: true }
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

			expect(get(userNetworks)).toEqual({
				...mockUserNetworksOnlyMainnetsComplete,
				...mockUserNetworks
			});
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

		it('should always return ICP network even if it is disabled', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						networks: {
							...mockNetworksSettings,
							networks: [
								[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }],
								[{ InternetComputer: null }, { enabled: false, is_testnet: false }]
							]
						}
					})
				}
			});

			expect(get(userNetworks)).toEqual({
				...mockUserNetworksOnlyMainnetsComplete,
				[SOLANA_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false },
				[ICP_NETWORK_ID]: { enabled: true, isTestnet: false },
				[ICP_PSEUDO_TESTNET_NETWORK_ID]: { enabled: true, isTestnet: true }
			});
		});

		// Every variant in the generated bindings is mapped today, so the cast below is the only
		// way to reach the state a new backend variant creates: decodable at the wire, unmapped
		// here. It does not stand in for a variant missing from the bindings — that one fails
		// Candid decoding upstream and never reaches this derived.
		it('should ignore an unmapped network key and keep mapping the known ones', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					settings: toNullable({
						...mockUserSettings,
						networks: {
							...mockNetworksSettings,
							networks: [
								[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }],
								// Stands in for a variant the bindings carry but `keyToNetworkId` has no arm for.
								[
									{ FutureNetworkMainnet: null } as unknown as NetworkSettingsFor,
									{ enabled: true, is_testnet: false }
								]
							]
						}
					})
				}
			});

			expect(() => get(userNetworks)).not.toThrow();

			expect(get(userNetworks)).toEqual({
				...mockUserNetworksOnlyMainnetsComplete,
				[SOLANA_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false },
				[ICP_NETWORK_ID]: { enabled: true, isTestnet: false },
				[ICP_PSEUDO_TESTNET_NETWORK_ID]: { enabled: true, isTestnet: true }
			});

			// Deduplication is asserted where it lives now, in error-analytics.services.spec.ts.
			expect(trackUnmappedNetworkSettingsKey).toHaveBeenCalledWith({
				key: 'FutureNetworkMainnet'
			});
		});
	});
});
