import type { TokenTypes } from '$lib/enums/token-types';
import type { OptionNetworkId } from '$lib/types/network';
import type { Option } from '$lib/types/utils';
import { derived, writable, type Readable } from 'svelte/store';

export type NftPagesStoreData = Option<{
	assetsTab?: TokenTypes;
	originSelectedNetwork: OptionNetworkId;
}>;

export interface NftPagesStore extends Readable<NftPagesStoreData> {
	setAssetsTab: (tab: TokenTypes) => void;
	setOriginSelectedNetwork: (networkId: OptionNetworkId) => void;
}

const initialStore: NftPagesStoreData = {
	assetsTab: undefined,
	originSelectedNetwork: undefined
};

export const initNftPagesStore = (): NftPagesContext => {
	const store = writable<NftPagesStoreData>(initialStore);

	const originSelectedNetwork = derived([store], ([$store]) => $store?.originSelectedNetwork);
	const assetsTab = derived([store], ([$store]) => $store?.assetsTab);

	return {
		subscribe: store.subscribe,
		originSelectedNetwork,
		assetsTab,

		setAssetsTab: (tab: TokenTypes) => {
			store.update((curr) => ({
				...(curr ?? initialStore),
				assetsTab: tab
			}));
		},

		setOriginSelectedNetwork: (networkId: OptionNetworkId) => {
			store.update((curr) => ({
				...(curr ?? initialStore),
				originSelectedNetwork: networkId
			}));
		}
	};
};

export interface NftPagesContext extends NftPagesStore {
	originSelectedNetwork: Readable<OptionNetworkId>;
	assetsTab: Readable<TokenTypes | undefined>;
}

export const NFT_PAGES_CONTEXT_KEY = Symbol('nft-pages');
