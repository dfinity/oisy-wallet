import { Token } from '$lib/enums/token';
import { balance as balanceService } from '$lib/providers/etherscan.providers';
import { testUSDC } from '$lib/providers/usdc.providers';
import { addressStore } from '$lib/stores/address.store';
import { balancesStore } from '$lib/stores/balances.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadBalance = async (): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	try {
		await testUSDC(address);
		const balance = await balanceService(address);
		balancesStore.set({ token: Token.ETHEREUM, balance });
	} catch (err: unknown) {
		balancesStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ETH balance.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
