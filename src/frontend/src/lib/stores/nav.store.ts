import { type TokenTypes } from '$lib/enums/token-types';
import type { OptionNetworkId } from '$lib/types/network';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type NavStoreData = Option<{
	selectedAssetsTab?: TokenTypes;
	userSelectedNetwork: OptionNetworkId;
}>;

export interface NavStore extends Readable<NavStoreData> {
	setSelectedAssetsTab: (tab: TokenTypes) => void;
	setUserSelectedNetwork: (networkId: OptionNetworkId) => void;
}

const initialStore: NavStoreData = {
	selectedAssetsTab: undefined,
	userSelectedNetwork: undefined
};

const initNavStore = (): NavStore => {
	const store = writable<NavStoreData>(initialStore);

	return {
		subscribe: store.subscribe,
		setSelectedAssetsTab: (tab: TokenTypes) => {
			store.update((curr) => ({
				...(curr ?? initialStore),
				selectedAssetsTab: tab
			}));
		},

		setUserSelectedNetwork: (networkId: OptionNetworkId) => {
			store.update((curr) => ({
				...(curr ?? initialStore),
				userSelectedNetwork: networkId
			}));
		}
	};
};

export const navStore = initNavStore();
