import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$icp-eth/constants/networks.constants';
import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { NETWORKS } from '$lib/constants/networks.constants';
import { address } from '$lib/derived/address.derived';
import { routeNetwork } from '$lib/derived/nav.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { OptionAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const networkId: Readable<NetworkId> = derived([routeNetwork], ([$routeNetwork]) =>
	nonNullish($routeNetwork)
		? NETWORKS.find(({ id }) => id.description === $routeNetwork)?.id ?? ETHEREUM_NETWORK_ID
		: ETHEREUM_NETWORK_ID
);

export const networkTokens: Readable<Token[]> = derived(
	[tokens, networkId],
	([$tokens, $networkId]) => $tokens.filter(({ network: { id } }) => id === $networkId)
);

export const networkICP: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdICP($networkId)
);

export const networkEthereum: Readable<boolean> = derived(
	[networkId],
	([$networkId]) => ETHEREUM_NETWORK_ID === $networkId
);

export const networkAddress: Readable<OptionAddress | string> = derived(
	[address, icrcAccountIdentifierText, networkICP],
	([$address, $icrcAccountIdentifierStore, $networkICP]) =>
		$networkICP ? $icrcAccountIdentifierStore : $address
);

export const selectedNetwork: Readable<Network> = derived(
	[networkId],
	([$networkId]) => NETWORKS.find(({ id }) => id === $networkId) ?? ETHEREUM_NETWORK
);
