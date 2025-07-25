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

	return {
		subscribe,
		mock: (data: Partial<RouteParams>) =>
			set({
				data
			}),
		mockUrl: (url: URL) => {
			set({
				url
			});
		},
		mockToken: ({ name, network: { id: networkId } }: Token) =>
			set({ data: { token: name, network: networkId.description } }),

		reset: () => set(initialStoreValue)
	};
};

export const mockPage = initPageStoreMock();
