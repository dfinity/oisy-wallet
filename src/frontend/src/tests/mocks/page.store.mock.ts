import { NETWORK_PARAM, TOKEN_PARAM, URI_PARAM } from '$lib/constants/routes.constants';
import type { Page } from '@sveltejs/kit';
import { writable } from 'svelte/store';

export const mockPageData = ({
	token = null,
	network = null
}: {
	token?: string | null;
	network?: string | null;
}): Page => ({
	params: {},
	route: { id: null },
	status: 200,
	error: null,
	data: {
		[TOKEN_PARAM]: token,
		[NETWORK_PARAM]: network,
		[URI_PARAM]: null
	},
	url: URL.prototype,
	state: {},
	form: null
});

export const mockPageStore = () => {
	vi.mock('$app/stores', () => ({
		page: writable(mockPageData({}))
	}));
};
