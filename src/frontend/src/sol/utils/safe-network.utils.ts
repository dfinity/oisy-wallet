import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { SolanaNetworkType } from '$sol/types/network';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { NullishError, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const safeMapNetworkIdToNetwork = (networkId: NetworkId): SolanaNetworkType => {
	const solNetwork = mapNetworkIdToNetwork(networkId);

	if (nonNullish(solNetwork)) {
		return solNetwork;
	}

	throw new NullishError(
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);
};
