import { balance as balanceService } from '$lib/providers/etherscan.providers';
import { addressStore } from '$lib/stores/address.store';
import { balanceStore } from '$lib/stores/balance.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadBalance = async () => {
	const address = get(addressStore);

	if (isNullish(address)) {
		// TODO: throw error?
		return;
	}

	try {
		const balance = await balanceService(address);
		balanceStore.set(balance);
	} catch (err: unknown) {
		balanceStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ETH balance' },
			err
		});
	}
};
