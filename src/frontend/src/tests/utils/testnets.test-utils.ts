import { testnetsStore } from '$lib/stores/settings.store';

export const setupTestnetsStore = (value: 'enabled' | 'disabled' | 'reset') => {
	if (value === 'reset') {
		testnetsStore.reset({ key: 'testnets' });
		return;
	}

	testnetsStore.set({ key: 'testnets', value: { enabled: value === 'enabled' } });
};
