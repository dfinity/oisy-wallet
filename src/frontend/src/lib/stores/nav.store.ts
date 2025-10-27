import type { TokenTypes } from '$lib/enums/token-types';
import { initStorageStore } from '$lib/stores/storage.store';
import type { OptionNetworkId } from '$lib/types/network';
import type { Option } from '$lib/types/utils';
import { get, type Readable } from 'svelte/store';

export type NavStoreData = Option<{
	activeAssetsTab?: TokenTypes;
	userSelectedNetwork: string | undefined;
}>;

export interface NavStore extends Readable<NavStoreData> {
	reset: () => void;
	setActiveAssetsTab: (tab: TokenTypes) => void;
	setUserSelectedNetwork: (networkId: OptionNetworkId) => void;
}

const initialStore: NavStoreData = {
	activeAssetsTab: undefined,
	userSelectedNetwork: undefined
};

const storageStoreKey = 'nav-store';

const initNavStore = (): NavStore => {
	const store = initStorageStore<NavStoreData>({
		key: storageStoreKey,
		defaultValue: initialStore
	});

	const curr = get(store) ?? initialStore;

	return {
		subscribe: store.subscribe,
		reset: () => store.reset({ key: storageStoreKey }),
		setActiveAssetsTab: (tab: TokenTypes) => {
			store.set({
				key: storageStoreKey,
				value: {
					...curr,
					activeAssetsTab: tab
				}
			});
		},

		setUserSelectedNetwork: (networkId: OptionNetworkId) => {
			store.set({
				key: storageStoreKey,
				value: {
					...curr,
					userSelectedNetwork: networkId?.description
				}
			});
		}
	};
};

export const navStore = initNavStore();
