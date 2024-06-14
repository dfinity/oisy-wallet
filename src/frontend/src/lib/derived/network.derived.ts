import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { DEFAULT_NETWORK, DEFAULT_NETWORK_ID } from '$lib/constants/networks.constants';
import { address } from '$lib/derived/address.derived';
import { routeNetwork } from '$lib/derived/nav.derived';
import { networks } from '$lib/derived/networks.derived';
import type { OptionAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const networkId: Readable<NetworkId> = derived(
	[networks, routeNetwork],
	([$networks, $routeNetwork]) =>
		nonNullish($routeNetwork)
			? $networks.find(({ id }) => id.description === $routeNetwork)?.id ?? DEFAULT_NETWORK_ID
			: DEFAULT_NETWORK_ID
);

export const selectedNetwork: Readable<Network> = derived(
	[networks, networkId],
	([$networks, $networkId]) => $networks.find(({ id }) => id === $networkId) ?? DEFAULT_NETWORK
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

export const manageableNetworkTokens: Readable<ManageableToken[]> = derived(
	[networkTokens],
	([$networkTokens]) => {
		const allIcrcCustomTokens: IcrcCustomToken[] = buildIcrcCustomTokens()
			.map((token) => ({
				...token,
				id: Symbol(token.symbol),
				enabled: false
			}))
			.filter((token) => token.indexCanisterVersion !== 'outdated');
		return mergeTokenLists<ManageableToken>(
			$networkTokens.map((token) => ({ ...token, enabled: true })),
			allIcrcCustomTokens
		);
	}
);
