import { getEthAddress } from '$lib/api/backend.api';
import { addressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';

export const loadAddress = async (): Promise<{ success: boolean }> => {
	try {
		const { identity } = get(authStore);

		const address = await getEthAddress(identity);
		addressStore.set(address);
	} catch (err: unknown) {
		addressStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ETH address.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
