import { page } from '$app/state';
import type { Nft, NftCollection } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { resetRouteParams, type RouteParams } from '$lib/utils/nav.utils';
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
		mockToken: ({ name, network: { id: networkId } }: Token) => {
			const data = { token: name, network: networkId.description };
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
