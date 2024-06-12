import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { determineIcrcLedgerCanisterEnvironment } from '$icp/utils/icrc.utils';
import { DEFAULT_NETWORK, DEFAULT_NETWORK_ID } from '$lib/constants/networks.constants';
import { address } from '$lib/derived/address.derived';
import { routeNetwork } from '$lib/derived/nav.derived';
import { networks } from '$lib/derived/networks.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { OptionAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdChainFusion,
	isNetworkIdEthereum,
	isNetworkIdICP
} from '$lib/utils/network.utils';
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

export const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork],
	([$tokens, $selectedNetwork]) =>
		$tokens.filter(
			({
				network: { id, env },
				ledgerCanisterId
			}: {
				network: Network;
				ledgerCanisterId?: LedgerCanisterIdText;
			}) =>
				isNetworkIdChainFusion($selectedNetwork.id)
					? nonNullish(ledgerCanisterId)
						? determineIcrcLedgerCanisterEnvironment(ledgerCanisterId) === $selectedNetwork.env
						: env === $selectedNetwork.env
					: id === $selectedNetwork.id
		)
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
