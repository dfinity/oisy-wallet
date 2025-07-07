import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet
} from '$lib/utils/network.utils';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { NullishError } from '@dfinity/utils';
import { get } from 'svelte/store';

export const mapNetworkIdToNetwork = (networkId: NetworkId): SolanaNetworkType => {
	if (isNetworkIdSOLMainnet(networkId)) {
		return SolanaNetworks.mainnet;
	}
	if (isNetworkIdSOLDevnet(networkId)) {
		return SolanaNetworks.devnet;
	}
	if (isNetworkIdSOLLocal(networkId)) {
		return SolanaNetworks.local;
	}

	throw new NullishError(
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);
};
