import { page } from '$app/state';
import type { Token } from '$lib/types/token';
import { resetRouteParams, type RouteParams } from '$lib/utils/nav.utils';
import type { Page } from '@sveltejs/kit';
import { writable } from 'svelte/store';

const initialStoreValue = {
	data: resetRouteParams(),
	route: {
		id: null
	}
};

const initPageStoreMock = () => {
	const { subscribe, set } = writable<Partial<Page>>(initialStoreValue);
	page.data = initialStoreValue.data;
	page.route = initialStoreValue.route;

	return {
		subscribe,
		mock: (data: Partial<RouteParams>) => {
			set({ data });
			page.data = data;
		},
		mockUrl: (url: URL) => {
			set({ url });
			page.url = url;
		},
		mockToken: ({ name, network: { id: networkId } }: Token) => {
			const data = { token: name, network: networkId.description };
			set({ data });
			page.data = data;
		},
		mockDynamicRoutes: (params: { [key: string]: string }) => {
			set({ params });
			page.params = params;
		},

		reset: () => set(initialStoreValue)
	};
};

export const mockPage = initPageStoreMock();
