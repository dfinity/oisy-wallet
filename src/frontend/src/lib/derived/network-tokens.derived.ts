import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import { ETHEREUM_TOKEN_ID, ICP_TOKEN_ID } from '$env/tokens.env';
import {
	notPseudoNetworkChainFusion,
	pseudoNetworkChainFusion,
	selectedNetwork
} from '$lib/derived/network.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { CanisterIdText } from '$lib/types/canister';
import type { Token } from '$lib/types/token';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All tokens matching the selected network or chain fusion, regardless if they are enabled by the user or not.
 */
export const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

export const enabledNetworkTokens: Readable<Token[]> = derived(
	[networkTokens],
	([$networkTokens]) =>
		$networkTokens.filter((token) => ('enabled' in token ? token.enabled : true))
);

export const filteredNetworkTokens: Readable<Token[]> = derived(
	[enabledNetworkTokens, notPseudoNetworkChainFusion],
	([$enabledNetworkTokens, $notPseudoNetworkChainFusion]) =>
		$notPseudoNetworkChainFusion
			? $enabledNetworkTokens
			: $enabledNetworkTokens.filter(
					(token) =>
						[ICP_TOKEN_ID, ETHEREUM_TOKEN_ID].includes(token.id) ||
						('ledgerCanisterId' in token &&
							ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(
								(token as { ledgerCanisterId: CanisterIdText }).ledgerCanisterId
							)) ||
						('enabled' in token && token.enabled)
				)
);
