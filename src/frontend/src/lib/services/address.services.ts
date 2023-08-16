import { getEthAddress } from '$lib/api/backend.api';
import { addressStore } from '$lib/stores/address.store';
import { toastsError } from '$lib/stores/toasts.store';

export const loadAddress = async (): Promise<{ success: boolean }> => {
	try {
		const address = await getEthAddress();
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
