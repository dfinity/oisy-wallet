import type { AddressData } from '$lib/stores/address.store';
import { metamaskStore } from '$lib/stores/metamask.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import detectEthereumProvider from '@metamask/detect-provider';

export const initMetamaskSupport = async () => {
	const provider = await detectEthereumProvider({
		mustBeMetaMask: true,
		silent: true
	});
	metamaskStore.set(provider?.isMetaMask ?? false);
};

export const openMetamaskTransaction = async (
	address: AddressData
): Promise<{ success: 'ok' | 'error'; err?: unknown }> => {
	let accounts: string[] | undefined;

	try {
		// TODO: create proper types
		accounts = await window.ethereum.request?.({ method: 'eth_requestAccounts' });
	} catch (err: unknown) {
		toastsError({
			msg: { text: 'Cannot get your accounts. Is your Metamask open and already connected?' }
		});

		return { success: 'error', err };
	}

	const [from] = accounts ?? [];

	if (isNullish(from)) {
		toastsError({
			msg: { text: 'No Metamask accounts found.' }
		});

		return { success: 'error' };
	}

	try {
		// TODO: create declaration types. It returns string which is the hash of the transaction.
		await window.ethereum.request?.({
			method: 'eth_sendTransaction',
			params: [
				{
					from,
					...(nonNullish(address) && { to: address }),
					// TODO: a value is required?
					value: '0x' + (50000000000000000).toString(16)
				}
			]
		});

		return { success: 'ok' };
	} catch (err: unknown) {
		// We silent the error here, no toast as the user may reject the transaction.
		return { success: 'error', err };
	}
};
