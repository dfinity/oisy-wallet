import {
	SUPPORTED_MAINNET_NETWORKS_IDS,
	SUPPORTED_NETWORKS_IDS,
	SUPPORTED_TESTNET_NETWORKS_IDS
} from '$env/networks/networks.env';
import { userProfileStore, type UserProfileStoreData } from '$lib/stores/user-profile.store';
import type { NetworkId } from '$lib/types/network';
import type { UserNetworks } from '$lib/types/user-networks';
import { mapUserNetworks } from '$lib/utils/user-networks.utils';
import { mockUserProfile, mockUserSettings } from '$tests/mocks/user-profile.mock';
import { fromNullable, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

export const setupUserNetworksStore = (
	value: 'allEnabled' | 'allDisabled' | 'onlyMainnets' | 'onlyTestnets'
) => {
	const userProfile: UserProfileStoreData = get(userProfileStore) ?? {
		profile: mockUserProfile,
		certified: false
	};

	const settings = fromNullable(userProfile.profile.settings) ?? mockUserSettings;

	const networkIds: NetworkId[] =
		value === 'onlyMainnets'
			? SUPPORTED_MAINNET_NETWORKS_IDS
			: value === 'onlyTestnets'
				? SUPPORTED_TESTNET_NETWORKS_IDS
				: SUPPORTED_NETWORKS_IDS;

	const userNetworks: UserNetworks = networkIds.reduce<UserNetworks>(
		(acc, id) => ({
			...acc,
			[id]: { enabled: value !== 'allDisabled', isTestnet: false }
		}),
		{}
	);

	userProfileStore.set({
		...userProfile,
		profile: {
			...userProfile.profile,
			settings: toNullable({
				...settings,
				networks: {
					...settings.networks,
					networks: mapUserNetworks(userNetworks)
				}
			})
		}
	});
};
