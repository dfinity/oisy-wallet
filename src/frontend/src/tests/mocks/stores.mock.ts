import { BTC_MAINNET_NETWORK_ID } from '$env/networks.env';
import { ICP_TOKEN_ID } from '$env/tokens.env';
import type { Page } from '@sveltejs/kit';
import { writable } from 'svelte/store';

const initialStoreValue = {
	data: {
		network: BTC_MAINNET_NETWORK_ID.description,
		token: ICP_TOKEN_ID.description
	}
};

const initPageStoreMock = () => {
	const { subscribe, set } = writable<Partial<Page>>(initialStoreValue);

	return {
		subscribe,

		mock: ({ data }: { data?: { network?: string; token?: string } }) =>
			set({
				data
			}),

		reset: () => set(initialStoreValue)
	};
};

export const page = initPageStoreMock();

export const navigating = writable(null);
