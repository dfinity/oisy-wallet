import { ETHEREUM_NETWORK, ICP_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { LOCAL } from '$lib/constants/app.constants';
import { DEFAULT_NETWORK, DEFAULT_NETWORK_ID } from '$lib/constants/networks.constants';
import { address } from '$lib/derived/address.derived';
import { routeNetwork } from '$lib/derived/nav.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { testnetsStore } from '$lib/stores/testnets.store';
import type { OptionAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived([testnetsStore], ([$testnetsStore]) => [
	...(ETH_MAINNET_ENABLED ? [ETHEREUM_NETWORK] : []),
	...($testnetsStore?.enabled ?? LOCAL ? [SEPOLIA_NETWORK] : []),
	ICP_NETWORK
]);

export const networkId: Readable<NetworkId> = derived(
	[networks, routeNetwork],
	([$networks, $routeNetwork]) =>
		nonNullish($routeNetwork)
			? $networks.find(({ id }) => id.description === $routeNetwork)?.id ?? DEFAULT_NETWORK_ID
			: DEFAULT_NETWORK_ID
);

export const networkTokens: Readable<Token[]> = derived(
	[tokens, networkId],
	([$tokens, $networkId]) => $tokens.filter(({ network: { id } }) => id === $networkId)
);

export const networkICP: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdICP($networkId)
);

export const networkEthereum: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdEthereum($networkId)
);

export const networkAddress: Readable<OptionAddress | string> = derived(
	[address, icrcAccountIdentifierText, networkICP],
	([$address, $icrcAccountIdentifierStore, $networkICP]) =>
		$networkICP ? $icrcAccountIdentifierStore : $address
);

export const selectedNetwork: Readable<Network> = derived(
	[networks, networkId],
	([$networks, $networkId]) => $networks.find(({ id }) => id === $networkId) ?? DEFAULT_NETWORK
);
