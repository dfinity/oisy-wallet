import { METAMASK_DEFAULT_TRANSFER_AMOUNT } from '$eth/constants/metamask.constants';
import { metamaskAccounts, sendMetamaskTransaction } from '$eth/providers/metamask.providers';
import { metamaskStore } from '$eth/stores/metamask.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionAddress } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';
import detectEthereumProvider from '@metamask/detect-provider';

export const initMetamaskSupport = async () => {
	const provider = await detectEthereumProvider({
		mustBeMetaMask: true,
		silent: true
	});
	metamaskStore.set(provider?.isMetaMask ?? false);
};

export const openMetamaskTransaction = async (
	address: OptionAddress
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
		await sendMetamaskTransaction({ from, to: address, value: METAMASK_DEFAULT_TRANSFER_AMOUNT });

		return { success: 'ok' };
	} catch (err: unknown) {
		// We silent the error here, no toast as the user may reject the transaction.
		return { success: 'error', err };
	}
};
