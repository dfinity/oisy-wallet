import { page } from '$app/state';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NftCollection } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { resetRouteParams, type RouteParams } from '$lib/utils/nav.utils';
import { getPageTokenIdentifier } from '$lib/utils/page-token.utils';
import type { Page } from '@sveltejs/kit';
import { writable } from 'svelte/store';

const initialStoreValue = {
	data: resetRouteParams(),
	route: {
		id: null
	},
	params: {}
};

const initPageStoreMock = () => {
	const { subscribe, set } = writable<Partial<Page>>(initialStoreValue);

	const resetPageState = () => {
		page.data = initialStoreValue.data;
		page.route = initialStoreValue.route;
		page.params = initialStoreValue.params;
	};

	resetPageState();

	return {
		subscribe,
		mock: (data: Partial<RouteParams>) => {
			set({ ...page, data });
			page.data = data;
		},
		mockRoute: (route: Page['route']) => {
			set({ ...page, route });
			page.route = route;
		},
		mockUrl: (url: URL) => {
			set({ ...page, url });
			page.url = url;
		},
		mockToken: (token: Token) => {
			const {
				network: { id: networkId }
			} = token;
			const data = { token: getPageTokenIdentifier(token), network: networkId.description };
			set({ ...page, data });
			page.data = data;
		},
		mockNetwork: (network: NetworkId['description']) => {
			const data = { network };
			set({ ...page, data });
			page.data = data;
		},
		mockCollection: ({ address, network: { id: networkId } }: NftCollection) => {
			const data = { collection: address, network: networkId.description };
			set({ ...page, data });
			page.data = data;
		},
		mockNft: ({
			id,
			collection: {
				address,
				network: { id: networkId }
			}
		}: Nft) => {
			const data = { nft: id, collection: address, network: networkId.description };
			set({ ...page, data });
			page.data = data;
		},
		mockDynamicRoutes: (params: { [key: string]: string }) => {
			set({ ...page, params });
			page.params = params;
		},

		reset: () => {
			set(initialStoreValue);
			resetPageState();
		}
	};
};

export const mockPage = initPageStoreMock();
