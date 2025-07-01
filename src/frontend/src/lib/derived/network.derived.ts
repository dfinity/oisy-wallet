import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { ethAddress } from '$lib/derived/address.derived';
import { routeNetwork } from '$lib/derived/nav.derived';
import { networks } from '$lib/derived/networks.derived';
import type { OptionEthAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import {
	isNetworkIdArbitrum,
	isNetworkIdBase,
	isNetworkIdBitcoin,
	isNetworkIdBsc,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdPolygon,
	isNetworkIdSolana,
	isPseudoNetworkIdIcpTestnet
} from '$lib/utils/network.utils';
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

export const pseudoNetworkICPTestnet: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isPseudoNetworkIdIcpTestnet($networkId)
);

export const networkICP: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdICP($networkId)
);

export const networkBitcoin: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdBitcoin($networkId)
);

export const networkEthereum: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdEthereum($networkId)
);

export const networkEvm: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdEvm($networkId)
);

export const networkBase: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdBase($networkId)
);

export const networkBsc: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdBsc($networkId)
);

export const networkPolygon: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdPolygon($networkId)
);

export const networkArbitrum: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdArbitrum($networkId)
);

export const networkSolana: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdSolana($networkId)
);

export const pseudoNetworkChainFusion: Readable<boolean> = derived(
	[selectedNetwork],
	([$selectedNetwork]) => isNullish($selectedNetwork)
);

export const networkAddress: Readable<OptionEthAddress | string> = derived(
	[ethAddress, icrcAccountIdentifierText, networkICP],
	([$address, $icrcAccountIdentifierStore, $networkICP]) =>
		$networkICP ? $icrcAccountIdentifierStore : $address
);
