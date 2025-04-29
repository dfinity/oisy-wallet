import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
import { userProfileStore, type UserProfileStoreData } from '$lib/stores/user-profile.store';
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

	const userNetworks: UserNetworks = SUPPORTED_NETWORKS.reduce<UserNetworks>(
		(acc, { id, env }) => ({
			...acc,
			[id]: {
				enabled:
					value === 'onlyMainnets'
						? env === 'mainnet'
						: value === 'onlyTestnets'
							? env === 'testnet'
							: value === 'allEnabled',
				isTestnet: env === 'testnet'
			}
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
