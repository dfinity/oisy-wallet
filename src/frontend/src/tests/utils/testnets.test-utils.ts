import * as testnetsStore from '$lib/derived/testnets.derived';
import { readable } from 'svelte/store';

export const setupTestnetsStore = (value: 'enabled' | 'disabled' | 'reset') => {
	vi.spyOn(testnetsStore, 'testnets', 'get').mockImplementation(() =>
		readable(value === 'enabled')
	);
};
