import { metamaskAccounts, sendMetamaskTransaction } from '$lib/providers/metamask.providers';
import type { AddressData } from '$lib/stores/address.store';
import { metamaskStore } from '$lib/stores/metamask.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish } from '@dfinity/utils';
import detectEthereumProvider from '@metamask/detect-provider';
import { hexlify, parseEther } from 'ethers/lib/utils';
import { ETH_DEFAULT_TRANSFER_AMOUNT } from '$lib/constants/eth.constants';


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
	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH destination address is unknown.' }
		});
		return { success: 'error' };
	}

	let accounts: string[] | undefined;

	try {
		accounts = await metamaskAccounts();
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
		await sendMetamaskTransaction({ from, to: address, value: hexlify(parseEther(String(ETH_DEFAULT_TRANSFER_AMOUNT))) });

		return { success: 'ok' };
	} catch (err: unknown) {
		// We silent the error here, no toast as the user may reject the transaction.
		return { success: 'error', err };
	}
};
