import { type TokenTypes } from '$lib/enums/token-types';
import { initStorageStore } from '$lib/stores/storage.store';
import type { OptionNetworkId } from '$lib/types/network';
import type { Option } from '$lib/types/utils';
import { type Readable } from 'svelte/store';

export type NavStoreData = Option<{
	selectedAssetsTab?: TokenTypes;
	userSelectedNetwork: OptionNetworkId;
}>;

export interface NavStore extends Readable<NavStoreData> {
	reset: () => void;
	setSelectedAssetsTab: (tab: TokenTypes) => void;
	setUserSelectedNetwork: (networkId: OptionNetworkId) => void;
}

const initialStore: NavStoreData = {
	selectedAssetsTab: undefined,
	userSelectedNetwork: undefined
};

const storageStoreKey = 'nav-store';

const initNavStore = (): NavStore => {
	const store = initStorageStore<NavStoreData>({
		key: storageStoreKey,
		defaultValue: initialStore
	});

	return {
		subscribe: store.subscribe,
		reset: () => store.set({ key: storageStoreKey, value: initialStore }),
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
