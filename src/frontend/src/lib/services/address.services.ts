import { getEthAddress } from '$lib/api/backend.api';
import { addressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';
import {getCode} from "$lib/providers/infura.providers";
import type {ETH_ADDRESS} from "$lib/types/address";

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

// source: https://github.com/ethers-io/ethers.js/discussions/3084#discussioncomment-2954385
export const isContractAddress = async (address: ETH_ADDRESS): Promise<boolean> => {
	try {
		const code = await getCode(address);
		return code !== '0x'
	} catch (err: unknown) {
		// We silent the error and consider the address as not being a contract for simplicity reason
		return false;
	}
}