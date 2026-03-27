import { METAMASK_DEFAULT_TRANSFER_AMOUNT } from '$eth/constants/metamask.constants';
import {
	metamaskAccounts,
	sendMetamaskTransaction,
	switchMetamaskChain
} from '$eth/providers/metamask.providers';
import { metamaskStore } from '$eth/stores/metamask.store';
import type { OptionEthAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';
import detectEthereumProvider from '@metamask/detect-provider';
import { get } from 'svelte/store';

export const initMetamaskSupport = async () => {
	const provider = await detectEthereumProvider({
		mustBeMetaMask: true,
		silent: true
	});
	metamaskStore.set(provider?.isMetaMask ?? false);
};

export const openMetamaskTransaction = async ({
	address,
	network: { chainId, name: networkName }
}: {
	address: OptionEthAddress;
	network: EthereumNetwork;
}): Promise<{
	success: 'ok' | 'error';
	err?: unknown;
}> => {
	const {
		send: {
			error: {
				destination_address_unknown,
				metamask_connected,
				metamask_no_accounts,
				metamask_switch_network
			}
		}
	} = get(i18n);

	if (isNullish(address)) {
		toastsError({
			msg: { text: destination_address_unknown }
		});
		return { success: 'error' };
	}

	let accounts: string[] | undefined;

	try {
		accounts = await metamaskAccounts();
	} catch (err: unknown) {
		toastsError({
			msg: { text: metamask_connected }
		});

		return { success: 'error', err };
	}

	const [from] = accounts ?? [];

	if (isNullish(from)) {
		toastsError({
			msg: { text: metamask_no_accounts }
		});

		return { success: 'error' };
	}

	try {
		await switchMetamaskChain(`0x${chainId}`);
	} catch (err: unknown) {
		toastsError({
			msg: {
				text: replacePlaceholders(metamask_switch_network, {
					$chain_id: `${chainId}`,
					$network_name: networkName
				})
			}
		});

		return { success: 'error', err };
	}

	try {
		await sendMetamaskTransaction({ from, to: address, value: METAMASK_DEFAULT_TRANSFER_AMOUNT });

		return { success: 'ok' };
	} catch (err: unknown) {
		// We silent the error here, no toast as the user may reject the transaction.
		return { success: 'error', err };
	}
};
