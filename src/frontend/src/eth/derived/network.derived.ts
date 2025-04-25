import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { selectedEvmNetwork } from '$evm/derived/network.derived';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import { networkId } from '$lib/derived/network.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const selectedEthereumNetwork: Readable<EthereumNetwork | undefined> = derived(
	[enabledEthereumNetworks, networkId],
	([$enabledEthereumNetworks, $networkId]) =>
		$enabledEthereumNetworks.find(({ id }) => id === $networkId)
);

// TODO: make this store return `string | undefined`
export const explorerUrl: Readable<string> = derived(
	[selectedEvmNetwork, selectedEthereumNetwork],
	([$selectedEvmNetwork, $selectedEthereumNetwork]) =>
		nonNullish($selectedEvmNetwork)
			? $selectedEvmNetwork?.explorerUrl
			: ($selectedEthereumNetwork?.explorerUrl ?? DEFAULT_ETHEREUM_NETWORK.explorerUrl)
);
