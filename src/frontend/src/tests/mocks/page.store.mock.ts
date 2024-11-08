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
		mock: (params: Partial<RouteParams>) =>
			set({
				data: params
			}),

		reset: () => set(initialStoreValue)
	};
};

export const page = initPageStoreMock();
