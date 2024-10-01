import { writable } from 'svelte/store';

export const mockPageStore = () => {
	vi.mock('$app/stores', () => ({
		page: writable({
			params: {},
			route: {},
			status: 200,
			error: null,
			data: {}
		})
	}));
};
