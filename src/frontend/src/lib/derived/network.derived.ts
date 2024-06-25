import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { address } from '$lib/derived/address.derived';
import { routeNetwork } from '$lib/derived/nav.derived';
import { networks } from '$lib/derived/networks.derived';
import type { OptionAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const networkId: Readable<NetworkId | undefined> = derived(
	[networks, routeNetwork],
	([$networks, $routeNetwork]) =>
		nonNullish($routeNetwork)
			? $networks.find(({ id }) => id.description === $routeNetwork)?.id
			: undefined
);

export const selectedNetwork: Readable<Network | undefined> = derived(
	[networks, networkId],
	([$networks, $networkId]) => $networks.find(({ id }) => id === $networkId)
);

export const networkICP: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdICP($networkId)
);

export const networkEthereum: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdEthereum($networkId)
);

export const pseudoNetworkChainFusion: Readable<boolean> = derived(
	[selectedNetwork],
	([$selectedNetwork]) => isNullish($selectedNetwork)
);

export const networkAddress: Readable<OptionAddress | string> = derived(
	[address, icrcAccountIdentifierText, networkICP],
	([$address, $icrcAccountIdentifierStore, $networkICP]) =>
		$networkICP ? $icrcAccountIdentifierStore : $address
);
